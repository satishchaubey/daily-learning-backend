import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private sesClient: SESClient;
  private readonly senderEmail: string;
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_SES_REGION') || 'ap-south-1';
    this.senderEmail = this.configService.get<string>('AWS_SES_SENDER_EMAIL') || 'noreply@devmastery.dev';
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    this.sesClient = new SESClient({
      region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      },
    });
  }

  /**
   * Send email verification link to new user
   */
  async sendVerificationEmail(to: string, username: string, verificationToken: string): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:5173';
    const verifyLink = `${appUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(to)}`;

    const subject = 'Verify Your DevMastery Account';
    const htmlBody = this.getEmailTemplate({
      title: 'Welcome to DevMastery! 🚀',
      greeting: `Hey ${username},`,
      message: 'You\'re one step away from starting your journey to become a Senior Software Engineer. Please verify your email to activate your account.',
      ctaText: 'Verify Email Address',
      ctaLink: verifyLink,
      footer: 'This verification link expires in 24 hours. If you didn\'t create this account, please ignore this email.',
    });

    await this.sendEmail(to, subject, htmlBody);
  }

  /**
   * Send password reset instructions (requires TOTP verification)
   */
  async sendPasswordResetEmail(to: string, username: string, resetToken: string): Promise<void> {
    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:5173';
    const resetLink = `${appUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(to)}`;

    const subject = 'Reset Your DevMastery Password';
    const htmlBody = this.getEmailTemplate({
      title: 'Password Reset Request 🔐',
      greeting: `Hey ${username},`,
      message: 'You\'ve successfully verified your identity via Google Authenticator. Click below to set a new password.',
      ctaText: 'Reset Password',
      ctaLink: resetLink,
      footer: 'This reset link expires in 15 minutes. If you didn\'t request this, please secure your account immediately.',
    });

    await this.sendEmail(to, subject, htmlBody);
  }

  /**
   * Core email sending via AWS SES
   */
  private async sendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
    // In development, log the email instead of sending
    if (!this.isProduction) {
      this.logger.warn(`📧 [DEV MODE] Email to: ${to}`);
      this.logger.warn(`📧 Subject: ${subject}`);
      this.logger.warn(`📧 Would send via AWS SES in production`);
      // Extract link from HTML for easy testing
      const linkMatch = htmlBody.match(/href="([^"]+)"/);
      if (linkMatch) {
        this.logger.warn(`📧 Action Link: ${linkMatch[1]}`);
      }
      return;
    }

    try {
      const command = new SendEmailCommand({
        Source: this.senderEmail,
        Destination: {
          ToAddresses: [to],
        },
        Message: {
          Subject: { Data: subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: htmlBody, Charset: 'UTF-8' },
          },
        },
      });

      await this.sesClient.send(command);
      this.logger.log(`✅ Email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send email to ${to}:`, error);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Beautiful branded email template
   */
  private getEmailTemplate(params: {
    title: string;
    greeting: string;
    message: string;
    ctaText: string;
    ctaLink: string;
    footer: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:#0f172a;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">
                DevMastery
              </h1>
              <p style="margin:8px 0 0;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">
                Daily Learning & Architecture Platform
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#0f172a;font-size:22px;font-weight:700;">
                ${params.title}
              </h2>
              <p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:1.6;">
                ${params.greeting}
              </p>
              <p style="margin:0 0 28px;color:#475569;font-size:14px;line-height:1.7;">
                ${params.message}
              </p>
              
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background:#0f172a;border-radius:8px;padding:14px 32px;">
                    <a href="${params.ctaLink}" 
                       style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.3px;display:block;">
                      ${params.ctaText}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 0;color:#94a3b8;font-size:12px;line-height:1.5;text-align:center;">
                ${params.footer}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:11px;">
                © ${new Date().getFullYear()} DevMastery. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }
}
