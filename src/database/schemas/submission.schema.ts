import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubmissionDocument = Submission & Document;

@Schema({ timestamps: true })
export class Submission {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  problemSlug: string;

  @Prop({ required: true })
  language: string;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true, enum: ['ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'COMPILATION_ERROR'] })
  status: string;

  @Prop({ default: 0 })
  runtimeMs: number;

  @Prop({ default: 0 })
  passedTests: number;

  @Prop({ default: 0 })
  totalTests: number;

  @Prop({ default: '' })
  stdout: string;
}

export const SubmissionSchema = SchemaFactory.createForClass(Submission);
