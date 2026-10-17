import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { RoadmapsModule } from './modules/roadmaps/roadmaps.module';
import { StreakModule } from './modules/streak/streak.module';
import { PracticeModule } from './modules/practice/practice.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    AuthModule,
    RoadmapsModule,
    StreakModule,
    PracticeModule,
  ],
})
export class AppModule {}
