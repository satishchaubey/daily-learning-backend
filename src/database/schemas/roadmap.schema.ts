import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RoadmapDocument = Roadmap & Document;

@Schema({ _id: false })
export class Topic {
  @Prop({ required: true })
  topicId: string;

  @Prop({ required: true })
  title: string;

  @Prop({ default: 'MEDIUM', enum: ['EASY', 'MEDIUM', 'ADVANCED'] })
  difficulty: string;

  @Prop({ default: 'MEDIUM_STREAK', enum: ['EASY_STREAK', 'MEDIUM_STREAK', 'ADVANCED_STREAK'] })
  streakTier: string;

  @Prop({ default: 'NONE', enum: ['DSA', 'SYSTEM_DESIGN', 'LLD', 'NONE'] })
  visualizerType: string;

  @Prop({ default: '' })
  summary: string;

  @Prop({ default: '' })
  markdownContent: string;

  @Prop({ default: 10 })
  readingTimeMinutes: number;

  @Prop({ type: Object, default: null })
  visualizerData: any;
}
export const TopicSchema = SchemaFactory.createForClass(Topic);

@Schema({ _id: false })
export class Chapter {
  @Prop({ required: true })
  chapterIndex: number;

  @Prop({ required: true })
  title: string;

  @Prop({ type: [TopicSchema], default: [] })
  topics: Topic[];
}
export const ChapterSchema = SchemaFactory.createForClass(Chapter);

@Schema({ timestamps: true })
export class Roadmap {
  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true, index: true })
  category: string;

  @Prop({ default: 'BEGINNER_TO_ADVANCED' })
  targetLevel: string;

  @Prop({ default: 0 })
  totalTopics: number;

  @Prop({ default: 0 })
  totalChapters: number;

  @Prop({ type: [ChapterSchema], default: [] })
  chapters: Chapter[];
}

export const RoadmapSchema = SchemaFactory.createForClass(Roadmap);
