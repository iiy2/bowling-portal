import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';
import * as functions from 'firebase-functions';
import { AppModule } from './app.module';

let app: any;

const getOrCreateApp = async () => {
  if (!app) {
    const server = express();
    const nestApp = await NestFactory.create(
      AppModule,
      new ExpressAdapter(server),
      {
        logger: ['error', 'warn', 'log'],
      },
    );

    // Enable CORS for Firebase Hosting domains
    nestApp.enableCors({
      origin: [
        'https://bowling-league-b4e28.web.app',
        'https://bowling-league-b4e28.firebaseapp.com',
        'http://localhost:5173', // Local development
      ],
      credentials: true,
    });

    // Global validation pipe
    nestApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Swagger API Documentation
    const config = new DocumentBuilder()
      .setTitle('Bowling League Organizer API')
      .setDescription(
        'API for managing bowling tournaments, players, and ratings',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('players', 'Player management')
      .addTag('seasons', 'Season management')
      .addTag('tournaments', 'Tournament management')
      .addTag('rating', 'Rating calculations')
      .addTag('statistics', 'Player statistics and leaderboards')
      .addTag('notifications', 'Notifications')
      .addTag('export', 'Data export')
      .build();

    const document = SwaggerModule.createDocument(nestApp, config);
    SwaggerModule.setup('api/docs', nestApp, document);

    await nestApp.init();
    app = server;
    console.log('Nest server initialized');
  }
  return app;
};

// Export the Express server as a Firebase Cloud Function
export const api = functions.https.onRequest(async (req, res) => {
  const server = await getOrCreateApp();
  server(req, res);
});
