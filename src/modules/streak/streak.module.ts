import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StreakService } from './streak.service';
import { StreakController } from './streak.controller';
import { User, UserSchema } from '../../database/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [StreakController],
  providers: [StreakService],
  exports: [StreakService],
})
export class StreakModule {}
