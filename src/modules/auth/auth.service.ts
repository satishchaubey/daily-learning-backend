import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { MailService } from './mail.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  // ─────────────────────────────────────────────────────
  // REGISTRATION FLOW
  // Step 1: Register → returns TOTP QR code for setup
  // Step 2: User scans QR in Google Authenticator
  // Step 3: User verifies TOTP code → account activated
  // ─────────────────────────────────────────────────────

  async register(username: string, email: string, password: string, phone?: string) {
    const existing = await this.userModel.findOne({ email });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Generate TOTP secret for Google Authenticator
    const secret = speakeasy.generateSecret({
      name: `DevMastery:${email}`,
      issuer: 'DevMastery',
    });

    const totpSecret = secret.base32;
    const otpAuthUrl = secret.otpauth_url;

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    // Create user with TOTP not yet enabled (will enable after first verification)
    const user = await this.userModel.create({
      username,
      email,
      passwordHash,
      phone: phone || null,
      totpSecret,
      isTotpEnabled: false,
      role: 'STUDENT',
      streaks: {
        easy: { current: 0, longest: 0, lastActiveDate: null },
        medium: { current: 0, longest: 0, lastActiveDate: null },
        advanced: { current: 0, longest: 0, lastActiveDate: null },
        freezeTokens: 2,
      },
    });

    this.logger.log(`✅ New user registered: ${email}`);

    return {
      message: 'Registration successful. Scan QR code in Google Authenticator and verify.',
      userId: user._id,
      email: user.email,
      totpSetup: {
        qrCode: qrCodeDataUrl,
        manualEntryKey: totpSecret,
        otpAuthUrl,
      },
    };
  }

  // ─────────────────────────────────────────────────────
  // VERIFY TOTP DURING REGISTRATION
  // Confirms user has Google Authenticator set up correctly
  // ─────────────────────────────────────────────────────

  async verifyTotpSetup(email: string, totpCode: string) {
    const user = await this.userModel.findOne({ email }).select('+totpSecret');
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.totpSecret) {
      throw new BadRequestException('TOTP not configured for this user');
    }

    const isValid = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token: totpCode,
      window: 1, // Allow 1 step tolerance (30s before/after)
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid authenticator code. Please try again.');
    }

    // Enable TOTP and mark email as verified
    user.isTotpEnabled = true;
    user.isEmailVerified = true;
    await user.save();

    // Generate full access JWT
    const token = this.generateToken(user, true);

    const { passwordHash, totpSecret, ...cleanUser } = user.toObject();
    this.logger.log(`✅ TOTP verified & account activated: ${email}`);

    return {
      message: 'Authenticator verified successfully. Account is now active!',
      token,
      user: cleanUser,
    };
  }

  // ─────────────────────────────────────────────────────
  // LOGIN FLOW
  // Step 1: Email + Password → partial token (no TOTP yet)
  // Step 2: TOTP code verification → full access token
  // ─────────────────────────────────────────────────────

  async login(email: string, password: string) {
    const user = await this.userModel.findOne({ email }).select('+passwordHash +totpSecret');
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Account requires password setup');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // If TOTP is enabled, require 2FA verification
    if (user.isTotpEnabled) {
      const partialToken = this.generateToken(user, false);
      return {
        requiresTotpVerification: true,
        partialToken,
        email: user.email,
        message: 'Password verified. Please enter your Google Authenticator code.',
      };
    }

    // TOTP not enabled — direct login
    const token = this.generateToken(user, true);
    const { passwordHash, totpSecret, ...cleanUser } = user.toObject();

    return {
      requiresTotpVerification: false,
      token,
      user: cleanUser,
    };
  }

  // ─────────────────────────────────────────────────────
  // VERIFY TOTP DURING LOGIN
  // ─────────────────────────────────────────────────────

  async verifyTotpLogin(email: string, totpCode: string) {
    const user = await this.userModel.findOne({ email }).select('+totpSecret');
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.totpSecret) {
      throw new BadRequestException('Authenticator not configured');
    }

    const isValid = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token: totpCode,
      window: 1,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid authenticator code');
    }

    const token = this.generateToken(user, true);
    const { passwordHash, totpSecret, ...cleanUser } = user.toObject();

    this.logger.log(`✅ TOTP login verified: ${email}`);

    return {
      message: 'Login successful!',
      token,
      user: cleanUser,
    };
  }

  // ─────────────────────────────────────────────────────
  // FORGOT PASSWORD FLOW
  // Step 1: User enters email/phone → finds account
  // Step 2: User must verify via Google Authenticator
  // Step 3: After TOTP verification → reset link sent via AWS SES
  // Step 4: User clicks link → sets new password
  // ─────────────────────────────────────────────────────

  async forgotPassword(emailOrPhone: string) {
    const user = await this.userModel.findOne({
      $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    });

    if (!user) {
      return {
        message: 'If an account exists with this email/phone, you will receive reset instructions.',
        requiresTotpVerification: true,
        email: emailOrPhone.includes('@') ? emailOrPhone : undefined,
      };
    }

    if (!user.isTotpEnabled) {
      throw new BadRequestException(
        'Google Authenticator is not enabled on this account. Please contact support.',
      );
    }

    return {
      message: 'Account found. Please verify your identity with Google Authenticator.',
      requiresTotpVerification: true,
      email: user.email,
    };
  }

  async verifyTotpForReset(email: string, totpCode: string) {
    const user = await this.userModel.findOne({ email }).select('+totpSecret');
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.totpSecret) {
      throw new BadRequestException('Authenticator not configured');
    }

    const isValid = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token: totpCode,
      window: 1,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid authenticator code');
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Save hashed token with 15-minute expiry
    user.passwordResetToken = resetTokenHash;
    user.passwordResetExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    // Send reset email via AWS SES
    await this.mailService.sendPasswordResetEmail(user.email, user.username, resetToken);

    this.logger.log(`✅ Password reset email sent to: ${email}`);

    return {
      message: 'Identity verified! A password reset link has been sent to your email.',
      resetEmailSent: true,
      resetToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined,
    };
  }

  async resetPassword(resetToken: string, newPassword: string) {
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    const user = await this.userModel.findOne({
      passwordResetToken: tokenHash,
      passwordResetExpiry: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();

    this.logger.log(`✅ Password reset successful for: ${user.email}`);

    return {
      message: 'Password reset successful! You can now login with your new password.',
    };
  }

  // ─────────────────────────────────────────────────────
  // GET CURRENT USER PROFILE (Protected Route)
  // ─────────────────────────────────────────────────────

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  // ─────────────────────────────────────────────────────
  // DEMO USER (for development/testing)
  // ─────────────────────────────────────────────────────

  async getDemoUser() {
    let demo = await this.userModel.findOne({ email: 'learner@dailymastery.dev' });
    if (!demo) {
      demo = await this.userModel.create({
        username: 'SeniorCandidate',
        email: 'learner@dailymastery.dev',
        role: 'PRO_DEV',
        isTotpEnabled: false,
        isEmailVerified: true,
        streaks: {
          easy: { current: 14, longest: 21, lastActiveDate: new Date().toISOString().slice(0, 10) },
          medium: { current: 8, longest: 12, lastActiveDate: new Date().toISOString().slice(0, 10) },
          advanced: { current: 3, longest: 5, lastActiveDate: new Date().toISOString().slice(0, 10) },
          freezeTokens: 2,
        },
        completedTopicIds: ['system-design-c1-t1', 'backend-c1-t1', 'leetcode-c1-t1'],
        solvedProblemIds: ['two-sum-target', 'lru-cache-implementation'],
      });
    }
    const token = this.generateToken(demo, true);
    return { token, user: demo };
  }

  // ─────────────────────────────────────────────────────
  // HELPER: Generate JWT Token
  // ─────────────────────────────────────────────────────

  private generateToken(user: any, isTotpVerified: boolean): string {
    return this.jwtService.sign({
      sub: user._id,
      email: user.email,
      role: user.role,
      isTotpVerified,
    });
  }
}
