import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ _id: false })
export class TierStreak {
  @Prop({ default: 0 })
  current: number;

  @Prop({ default: 0 })
  longest: number;

  @Prop({ default: null })
  lastActiveDate: string | null; // Format: 'YYYY-MM-DD'
}
export const TierStreakSchema = SchemaFactory.createForClass(TierStreak);

@Schema({ _id: false })
export class UserStreaks {
  @Prop({ type: TierStreakSchema, default: () => ({ current: 0, longest: 0, lastActiveDate: null }) })
  easy: TierStreak; // 1 Chapter read or 1 concept/quiz completed

  @Prop({ type: TierStreakSchema, default: () => ({ current: 0, longest: 0, lastActiveDate: null }) })
  medium: TierStreak; // 1 Medium coding problem solved

  @Prop({ type: TierStreakSchema, default: () => ({ current: 0, longest: 0, lastActiveDate: null }) })
  advanced: TierStreak; // 1 System Design or Advanced Algorithm solved

  @Prop({ default: 2 })
  freezeTokens: number;
}
export const UserStreaksSchema = SchemaFactory.createForClass(UserStreaks);

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, index: true })
  email: string;

  @Prop({ required: true })
  username: string;

  @Prop({ select: false })
  passwordHash?: string;

  @Prop({ default: null })
  phone?: string;

  @Prop({ default: 'STUDENT', enum: ['STUDENT', 'PRO_DEV', 'SENIOR_ARCHITECT', 'ADMIN'] })
  role: string;

  @Prop({ default: 'Asia/Kolkata' })
  timezone: string;

  // Google Authenticator TOTP Fields
  @Prop({ select: false, default: null })
  totpSecret?: string;

  @Prop({ default: false })
  isTotpEnabled: boolean;

  // Email Verification
  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ select: false, default: null })
  emailVerificationToken?: string;

  @Prop({ default: null })
  emailVerificationExpiry?: Date;

  // Password Reset
  @Prop({ select: false, default: null })
  passwordResetToken?: string;

  @Prop({ default: null })
  passwordResetExpiry?: Date;

  @Prop({ type: UserStreaksSchema, default: () => ({}) })
  streaks: UserStreaks;

  @Prop({ type: [String], default: [] })
  completedTopicIds: string[];

  @Prop({ type: [String], default: [] })
  solvedProblemIds: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);
