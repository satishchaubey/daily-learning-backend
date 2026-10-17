import { Controller, Get, Post, Param, Query, NotFoundException, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { RoadmapsService } from './roadmaps.service';

@ApiTags('roadmaps')
@Controller('api/roadmaps')
export class RoadmapsController {
  constructor(private readonly roadmapsService: RoadmapsService) {}

  @Get()
  @ApiOperation({ summary: 'List all available roadmaps and tracks' })
  @ApiQuery({ name: 'category', required: false })
  async getAllRoadmaps(@Query('category') category?: string) {
    return this.roadmapsService.getAllRoadmaps(category);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get full book roadmap with all chapters and topics' })
  async getRoadmapBySlug(@Param('slug') slug: string) {
    const roadmap = await this.roadmapsService.getRoadmapBySlug(slug);
    if (!roadmap) throw new NotFoundException(`Roadmap '${slug}' not found`);
    return roadmap;
  }

  @Get(':slug/pdf')
  @ApiOperation({ summary: 'Download original byte-for-byte PDF restored from database' })
  async downloadPdf(@Param('slug') slug: string, @Res() res: Response) {
    const item = await this.roadmapsService.getPdfArchive(slug);
    if (!item) throw new NotFoundException(`Archived PDF for '${slug}' not found`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${item.filename}"`);
    res.send(item.buffer);
  }

  @Get(':slug/topics/:topicId')
  @ApiOperation({ summary: 'Get single topic content and visualizer configuration' })
  async getTopicDetails(
    @Param('slug') slug: string,
    @Param('topicId') topicId: string,
  ) {
    const topic = await this.roadmapsService.getTopicDetails(slug, topicId);
    if (!topic) throw new NotFoundException(`Topic '${topicId}' not found`);
    return topic;
  }

  @Post('seed')
  @ApiOperation({ summary: 'Seed all 46 roadmaps into MongoDB' })
  async seedRoadmaps() {
    const count = await this.roadmapsService.seedFromCurriculum();
    return { success: true, seededCount: count };
  }
}
