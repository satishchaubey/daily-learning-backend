import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  RegisterDto,
  LoginDto,
  VerifyTotpDto,
  ForgotPasswordDto,
  VerifyResetTotpDto,
  ResetPasswordDto,
} from './dto/auth.dto';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── REGISTRATION ───────────────────────────────────

  @Post('register')
  @ApiOperation({ summary: 'Register new user — returns QR code for Google Authenticator setup' })
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body.username, body.email, body.password, body.phone);
  }

  @Post('verify-totp-setup')
  @ApiOperation({ summary: 'Verify TOTP code during registration to activate account' })
  async verifyTotpSetup(@Body() body: VerifyTotpDto) {
    return this.authService.verifyTotpSetup(body.email, body.totpCode);
  }

  // ─── LOGIN ──────────────────────────────────────────

  @Post('login')
  @ApiOperation({ summary: 'Login with email & password — returns TOTP verification requirement' })
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Post('verify-totp-login')
  @ApiOperation({ summary: 'Verify TOTP code during login for full access' })
  async verifyTotpLogin(@Body() body: VerifyTotpDto) {
    return this.authService.verifyTotpLogin(body.email, body.totpCode);
  }

  // ─── FORGOT PASSWORD ───────────────────────────────

  @Post('forgot-password')
  @ApiOperation({ summary: 'Initiate forgot password — finds account by email or phone' })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.emailOrPhone);
  }

  @Post('verify-totp-reset')
  @ApiOperation({ summary: 'Verify TOTP for password reset — sends reset email via AWS SES' })
  async verifyTotpForReset(@Body() body: VerifyResetTotpDto) {
    return this.authService.verifyTotpForReset(body.email, body.totpCode);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with valid reset token' })
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.resetToken, body.newPassword);
  }

  // ─── PROTECTED ROUTES ──────────────────────────────

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.userId);
  }

  // ─── DEV/DEMO ──────────────────────────────────────

  @Get('demo')
  @ApiOperation({ summary: 'Get ready-to-use demo profile with realistic multi-tier streaks' })
  async getDemoUser() {
    return this.authService.getDemoUser();
  }
}
