import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { FirestoreService } from '../../firestore/firestore.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

interface User {
  id: string;
  email: string;
  role: string;
  languagePreference: string;
  themePreference: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private firestore: FirestoreService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-secret-key',
    });
  }

  async validate(payload: JwtPayload) {
    const userDoc = await this.firestore.doc('users', payload.sub).get();

    if (!userDoc.exists) {
      throw new UnauthorizedException();
    }

    const user = userDoc.data() as User;

    return {
      id: userDoc.id,
      email: user.email,
      role: user.role,
      languagePreference: user.languagePreference,
      themePreference: user.themePreference,
    };
  }
}
