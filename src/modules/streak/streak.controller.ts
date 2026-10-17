import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { StreakService } from './streak.service';

@ApiTags('streaks')
@Controller('api/streaks')
export class StreakController {
  constructor(private readonly streakService: StreakService) {}

  @Get(':userId')
  @ApiOperation({ summary: 'Get current user multi-tier streaks' })
  async getStreak(@Param('userId') userId: string) {
    return this.streakService.getUserStreak(userId);
  }

  @Post(':userId/activity')
  @ApiOperation({ summary: 'Record daily activity for easy, medium, or advanced streak tier' })
  async recordActivity(
    @Param('userId') userId: string,
    @Body() body: { tier: 'easy' | 'medium' | 'advanced'; actionId?: string },
  ) {
    return this.streakService.recordActivity(userId, body.tier, body.actionId);
  }

  @Post(':userId/freeze')
  @ApiOperation({ summary: 'Consume a freeze token to prevent streak reset' })
  async useFreeze(@Param('userId') userId: string) {
    return this.streakService.useFreezeToken(userId);
  }
}
