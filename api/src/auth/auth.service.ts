import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { FirestoreService } from '../firestore/firestore.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

interface User {
  id: string;
  email: string;
  password: string;
  role: string;
  languagePreference: string;
  themePreference: string;
  playerId?: string | null;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

@Injectable()
export class AuthService {
  constructor(
    private firestore: FirestoreService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const {
      email,
      password,
      firstName,
      lastName,
      languagePreference,
      themePreference,
    } = registerDto;

    // Use transaction for atomic user creation with email uniqueness
    return this.firestore.runTransaction(async (transaction) => {
      // Check email uniqueness
      const emailConstraintRef = this.firestore
        .collection('uniqueConstraints')
        .doc('emails')
        .collection('values')
        .doc(email.toLowerCase());

      const emailDoc = await transaction.get(emailConstraintRef);
      if (emailDoc.exists) {
        throw new ConflictException('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate IDs
      const userId = this.firestore.generateId();
      const playerId = this.firestore.generateId();

      // Create user document
      const userRef = this.firestore.doc('users', userId);
      const userData: Omit<User, 'createdAt' | 'updatedAt'> & {
        createdAt: FirebaseFirestore.FieldValue;
        updatedAt: FirebaseFirestore.FieldValue;
      } = {
        id: userId,
        email,
        password: hashedPassword,
        role: 'REGULAR',
        languagePreference: languagePreference || 'en',
        themePreference: themePreference || 'light',
        playerId,
        createdAt: this.firestore.serverTimestamp(),
        updatedAt: this.firestore.serverTimestamp(),
      };

      // Create player document
      const playerRef = this.firestore.doc('players', playerId);
      const playerData = {
        id: playerId,
        userId,
        firstName,
        lastName,
        firstNameLower: firstName.toLowerCase(),
        lastNameLower: lastName.toLowerCase(),
        email,
        emailLower: email.toLowerCase(),
        phone: null,
        registrationDate: this.firestore.serverTimestamp(),
        isActive: true,
        createdAt: this.firestore.serverTimestamp(),
        updatedAt: this.firestore.serverTimestamp(),
        overallStats: {
          averageScore: 0,
          highestScore: 0,
          totalTournamentsPlayed: 0,
          totalRatingPoints: 0,
        },
      };

      // Execute all writes in transaction
      transaction.set(emailConstraintRef, {
        documentId: userId,
        createdAt: this.firestore.serverTimestamp(),
      });
      transaction.set(userRef, userData);
      transaction.set(playerRef, playerData);

      // Generate tokens
      const tokens = await this.generateTokens(userId, email, 'REGULAR');

      return {
        ...tokens,
        user: {
          id: userId,
          email,
          role: 'REGULAR',
          languagePreference: languagePreference || 'en',
          themePreference: themePreference || 'light',
        },
      };
    });
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Find user by email
    const usersSnapshot = await this.firestore
      .collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const userDoc = usersSnapshot.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() } as User;

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        languagePreference: user.languagePreference,
        themePreference: user.themePreference,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const userDoc = await this.firestore.doc('users', payload.sub).get();

      if (!userDoc.exists) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = { id: userDoc.id, ...userDoc.data() } as User;

      const tokens = await this.generateTokens(user.id, user.email, user.role);

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          languagePreference: user.languagePreference,
          themePreference: user.themePreference,
        },
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getMe(userId: string) {
    const userDoc = await this.firestore.doc('users', userId).get();

    if (!userDoc.exists) {
      throw new UnauthorizedException('User not found');
    }

    const user = userDoc.data() as User;

    return {
      id: userDoc.id,
      email: user.email,
      role: user.role,
      languagePreference: user.languagePreference,
      themePreference: user.themePreference,
      createdAt: this.firestore.fromTimestamp(user.createdAt),
    };
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret:
          this.configService.get<string>('JWT_SECRET') || 'your-secret-key',
        expiresIn:
          this.configService.get<string>('JWT_EXPIRATION') || ('1h' as any),
      }),
      this.jwtService.signAsync(payload, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          'your-refresh-secret',
        expiresIn:
          this.configService.get<string>('JWT_REFRESH_EXPIRATION') ||
          ('7d' as any),
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
