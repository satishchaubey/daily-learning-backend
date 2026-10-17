import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PracticeService } from './practice.service';
import { PracticeController } from './practice.controller';
import { Problem, ProblemSchema } from '../../database/schemas/problem.schema';
import { Submission, SubmissionSchema } from '../../database/schemas/submission.schema';
import { StreakModule } from '../streak/streak.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Problem.name, schema: ProblemSchema },
      { name: Submission.name, schema: SubmissionSchema },
    ]),
    StreakModule,
  ],
  controllers: [PracticeController],
  providers: [PracticeService],
  exports: [PracticeService],
})
export class PracticeModule {}
