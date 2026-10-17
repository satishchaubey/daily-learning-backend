import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PdfArchiveDocument = PdfArchive & Document;

@Schema({ collection: 'pdf_archives', timestamps: true })
export class PdfArchive {
  @Prop({ required: true, unique: true, index: true })
  filename: string; // e.g. "system-design.pdf", "ai-engineer.pdf"

  @Prop({ required: true, index: true })
  roadmapSlug: string; // e.g. "system-design", "ai-engineer"

  @Prop({ required: true })
  sizeBytes: number;

  @Prop({ required: true })
  sha256: string;

  @Prop({ default: 'application/pdf' })
  mimeType: string;

  @Prop({ required: true })
  base64Data: string; // Exact byte-for-byte binary preservation
}

export const PdfArchiveSchema = SchemaFactory.createForClass(PdfArchive);
