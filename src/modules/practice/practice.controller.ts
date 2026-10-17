import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PracticeService } from './practice.service';

@ApiTags('practice')
@Controller('api/practice')
export class PracticeController {
  constructor(private readonly practiceService: PracticeService) {}

  @Get('problems')
  @ApiOperation({ summary: 'List coding and system design problems' })
  @ApiQuery({ name: 'tier', required: false })
  @ApiQuery({ name: 'category', required: false })
  async getProblems(
    @Query('tier') tier?: string,
    @Query('category') category?: string,
  ) {
    return this.practiceService.getAllProblems(tier, category);
  }

  @Get('problems/:slug')
  @ApiOperation({ summary: 'Get single problem definition with starter code & test cases' })
  async getProblem(@Param('slug') slug: string) {
    return this.practiceService.getProblemBySlug(slug);
  }

  @Post('submit')
  @ApiOperation({ summary: 'Submit solution, run test cases, and update streaks' })
  async submit(
    @Body()
    body: {
      userId: string;
      problemSlug: string;
      language: string;
      code: string;
    },
  ) {
    return this.practiceService.submitSolution(
      body.userId,
      body.problemSlug,
      body.language,
      body.code,
    );
  }
}
