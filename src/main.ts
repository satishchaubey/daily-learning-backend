
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('Daily Mastery Platform API')
    .setDescription('Enterprise Production API for Roadmaps, Multi-Tier Streaks, and Code Practice')
    .setVersion('1.0')
    .addTag('roadmaps')
    .addTag('streaks')
    .addTag('practice')
    .addTag('auth')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`🚀 Daily Mastery Enterprise Server running on: http://localhost:${port}`);
  logger.log(`📚 Swagger OpenAPI Documentation available on: http://localhost:${port}/api/docs`);
}

bootstrap();
