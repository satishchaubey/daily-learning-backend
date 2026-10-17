import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { Roadmap, RoadmapDocument } from '../../database/schemas/roadmap.schema';

@Injectable()
export class RoadmapsService implements OnModuleInit {
  private readonly logger = new Logger(RoadmapsService.name);
  private memoryCache: any[] = [];

  constructor(
    @InjectModel(Roadmap.name) private roadmapModel: Model<RoadmapDocument>,
  ) {}

  async onModuleInit() {
    this.loadFallbackCache();
  }

  private loadFallbackCache() {
    try {
      const candidates = [
        path.join(__dirname, '../../../../data/curriculum.json'),
        path.join(process.cwd(), '../data/curriculum.json'),
        path.join(process.cwd(), 'data/curriculum.json'),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf-8');
          this.memoryCache = JSON.parse(raw);
          this.logger.log(`Loaded ${this.memoryCache.length} roadmaps into memory cache from ${p}`);
          break;
        }
      }
    } catch (e) {
      this.logger.warn(`Could not load local curriculum.json fallback: ${e.message}`);
    }
  }

  async getAllRoadmaps(category?: string) {
    try {
      const query = category ? { category } : {};
      const fromDb = await this.roadmapModel.find(query, { chapters: 0 }).lean();
      if (fromDb && fromDb.length > 0) return fromDb;
    } catch (err) {
      this.logger.warn(`Database query failed, returning cached roadmaps: ${err.message}`);
    }

    if (category) {
      return this.memoryCache
        .filter((r) => r.category.toLowerCase() === category.toLowerCase())
        .map(({ chapters, ...rest }) => rest);
    }
    return this.memoryCache.map(({ chapters, ...rest }) => rest);
  }

  async getRoadmapBySlug(slug: string) {
    try {
      const fromDb = await this.roadmapModel.findOne({ slug }).lean();
      if (fromDb) return fromDb;
    } catch (err) {
      this.logger.warn(`Database query failed, falling back to cache: ${err.message}`);
    }

    const found = this.memoryCache.find((r) => r.slug === slug || r.id === slug);
    return found || null;
  }

  async getTopicDetails(roadmapSlug: string, topicId: string) {
    const roadmap = await this.getRoadmapBySlug(roadmapSlug);
    if (!roadmap) return null;

    for (const ch of roadmap.chapters || []) {
      for (const tp of ch.topics || []) {
        if (tp.topicId === topicId) {
          return {
            roadmapTitle: roadmap.title,
            chapterTitle: ch.title,
            ...tp,
          };
        }
      }
    }
    return null;
  }

  async seedFromCurriculum(): Promise<number> {
    if (!this.memoryCache || this.memoryCache.length === 0) {
      this.loadFallbackCache();
    }
    let seeded = 0;
    for (const item of this.memoryCache) {
      await this.roadmapModel.updateOne(
        { slug: item.slug },
        { $set: item },
        { upsert: true },
      );
      seeded++;
    }
    return seeded;
  }

  async getPdfArchive(slug: string): Promise<{ buffer: Buffer; filename: string } | null> {
    try {
      const candidates = [
        path.join(__dirname, '../../../../data/pdf_store.json'),
        path.join(process.cwd(), '../data/pdf_store.json'),
        path.join(process.cwd(), 'data/pdf_store.json'),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf-8');
          const list = JSON.parse(raw);
          const found = list.find((item: any) => item.roadmapSlug === slug || item.filename === `${slug}.pdf`);
          if (found) {
            return {
              buffer: Buffer.from(found.base64Data, 'base64'),
              filename: found.filename,
            };
          }
        }
      }
    } catch {}
    return null;
  }
}
