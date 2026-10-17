import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProblemDocument = Problem & Document;

@Schema({ _id: false })
export class TestCase {
  @Prop({ required: true })
  input: string;

  @Prop({ required: true })
  expectedOutput: string;

  @Prop({ default: false })
  isHidden: boolean;

  @Prop({ default: '' })
  explanation: string;
}
export const TestCaseSchema = SchemaFactory.createForClass(TestCase);

@Schema({ timestamps: true })
export class Problem {
  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true, index: true })
  category: string; // 'DSA', 'LLD', 'System Design', 'Concurrency', 'SQL'

  @Prop({ required: true, enum: ['EASY', 'MEDIUM', 'ADVANCED'] })
  difficulty: string;

  @Prop({ required: true, enum: ['EASY_STREAK', 'MEDIUM_STREAK', 'ADVANCED_STREAK'] })
  streakTier: string;

  @Prop({ required: true })
  descriptionMarkdown: string;

  @Prop({ type: Object, default: {} })
  starterTemplates: Record<string, string>; // { javascript: '...', python: '...', typescript: '...' }

  @Prop({ type: [TestCaseSchema], default: [] })
  testCases: TestCase[];

  @Prop({ type: Object, default: null })
  visualizerPayload: any;
}

export const ProblemSchema = SchemaFactory.createForClass(Problem);
