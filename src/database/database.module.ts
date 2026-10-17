import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User, UserSchema } from './schemas/user.schema';
import { Roadmap, RoadmapSchema } from './schemas/roadmap.schema';
import { Problem, ProblemSchema } from './schemas/problem.schema';
import { Submission, SubmissionSchema } from './schemas/submission.schema';
import { PdfArchive, PdfArchiveSchema } from './schemas/pdf-archive.schema';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URI') || 'mongodb://127.0.0.1:27017/daily_learning_app';
        return {
          uri,
          serverSelectionTimeoutMS: 5000,
        };
      },
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Roadmap.name, schema: RoadmapSchema },
      { name: Problem.name, schema: ProblemSchema },
      { name: Submission.name, schema: SubmissionSchema },
      { name: PdfArchive.name, schema: PdfArchiveSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
