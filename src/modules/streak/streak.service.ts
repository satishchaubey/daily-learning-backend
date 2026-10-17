import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../database/schemas/user.schema';

@Injectable()
export class StreakService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  private getDateString(date: Date, timezone: string = 'Asia/Kolkata'): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  private daysBetween(dateStr1: string, dateStr2: string): number {
    const d1 = new Date(dateStr1 + 'T00:00:00Z');
    const d2 = new Date(dateStr2 + 'T00:00:00Z');
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  }

  async getUserStreak(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return user.streaks;
  }

  async recordActivity(
    userId: string,
    tier: 'easy' | 'medium' | 'advanced',
    actionId?: string,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const today = this.getDateString(new Date(), user.timezone);
    const tierData = user.streaks[tier];

    if (!tierData.lastActiveDate) {
      tierData.current = 1;
      tierData.longest = Math.max(tierData.longest || 0, 1);
      tierData.lastActiveDate = today;
    } else {
      const days = this.daysBetween(tierData.lastActiveDate, today);

      if (days === 0) {
        // Already active today; keep current streak maintained
      } else if (days === 1) {
        // Active on the very next day! Consecutive streak increments
        tierData.current += 1;
        tierData.longest = Math.max(tierData.longest, tierData.current);
        tierData.lastActiveDate = today;
      } else {
        // Missed at least 1 day. Strict reset rule: start from 1!
        tierData.current = 1;
        tierData.lastActiveDate = today;
      }
    }

    if (actionId) {
      if (tier === 'easy' && !user.completedTopicIds.includes(actionId)) {
        user.completedTopicIds.push(actionId);
      } else if ((tier === 'medium' || tier === 'advanced') && !user.solvedProblemIds.includes(actionId)) {
        user.solvedProblemIds.push(actionId);
      }
    }

    user.markModified('streaks');
    await user.save();

    return {
      success: true,
      tier,
      currentStreak: tierData.current,
      longestStreak: tierData.longest,
      streaks: user.streaks,
    };
  }

  async useFreezeToken(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (user.streaks.freezeTokens <= 0) {
      return { success: false, message: 'No freeze tokens available' };
    }

    const today = this.getDateString(new Date(), user.timezone);
    user.streaks.freezeTokens -= 1;
    // Protect all active tiers
    for (const tier of ['easy', 'medium', 'advanced'] as const) {
      if (user.streaks[tier].current > 0) {
        user.streaks[tier].lastActiveDate = today;
      }
    }

    user.markModified('streaks');
    await user.save();
    return { success: true, remainingTokens: user.streaks.freezeTokens };
  }
}
