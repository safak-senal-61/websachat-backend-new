import nodemailer from 'nodemailer';
import { logger } from '@/utils/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: options.from || process.env.SMTP_FROM || process.env.SMTP_USER,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${options.to}`, { messageId: info.messageId });
    } catch (error) {
      logger.error('Failed to send email', { error, to: options.to, subject: options.subject });
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(to: string, username: string): Promise<void> {
    const subject = 'Welcome to WebsaChat!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; text-align: center;">Welcome to WebsaChat!</h1>
        <p>Hi ${username},</p>
        <p>Welcome to WebsaChat! We're excited to have you join our community of streamers and viewers.</p>
        <p>Here's what you can do next:</p>
        <ul>
          <li>Complete your profile setup</li>
          <li>Start your first live stream</li>
          <li>Follow other streamers</li>
          <li>Engage with the community</li>
        </ul>
        <p>If you have any questions, feel free to reach out to our support team.</p>
        <p>Happy streaming!</p>
        <p>The WebsaChat Team</p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(to: string, username: string, verificationToken: string): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const subject = 'Verify Your Email Address';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; text-align: center;">Verify Your Email Address</h1>
        <p>Hi ${username},</p>
        <p>Thank you for signing up for WebsaChat! To complete your registration, please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p>This verification link will expire in 24 hours.</p>
        <p>If you didn't create an account with WebsaChat, please ignore this email.</p>
        <p>Best regards,<br>The WebsaChat Team</p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to: string, username: string, resetToken: string): Promise<void> {
    const baseUrl =
      (process.env.FRONTEND_URL && process.env.FRONTEND_URL.replace(/\/$/, '')) ||
      `http://192.168.2.55:${process.env.PORT || 5000}`;
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
    const expiresText = this.getPasswordResetExpiryDescription();
    const subject = 'Reset Your Password';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; text-align: center;">Reset Your Password</h1>
        <p>Hi ${username},</p>
        <p>We received a request to reset your password for your WebsaChat account. Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p>This password reset link will expire in ${expiresText}.</p>
        <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
        <p>Best regards,<br>The WebsaChat Team</p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }

  /**
   * Send password change confirmation email
   */
  async sendPasswordChangeConfirmation(to: string, username: string): Promise<void> {
    const subject = 'Password Changed Successfully';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333; text-align: center;">Password Changed Successfully</h1>
        <p>Hi ${username},</p>
        <p>Your password has been successfully changed for your WebsaChat account.</p>
        <p>If you didn't make this change, please contact our support team immediately.</p>
        <p>For security reasons, we recommend:</p>
        <ul>
          <li>Using a strong, unique password</li>
          <li>Enabling two-factor authentication</li>
          <li>Regularly updating your password</li>
        </ul>
        <p>Best regards,<br>The WebsaChat Team</p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }

  /**
   * Send account suspension notification
   */
  async sendAccountSuspensionEmail(to: string, username: string, reason: string, duration?: string): Promise<void> {
    const subject = 'Account Suspension Notification';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #dc3545; text-align: center;">Account Suspension Notification</h1>
        <p>Hi ${username},</p>
        <p>We're writing to inform you that your WebsaChat account has been suspended.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        ${duration ? `<p><strong>Duration:</strong> ${duration}</p>` : '<p>This suspension is permanent.</p>'}
        <p>If you believe this suspension was made in error, you can appeal by contacting our support team.</p>
        <p>Please review our Community Guidelines to ensure compliance when your account is reinstated.</p>
        <p>Best regards,<br>The WebsaChat Moderation Team</p>
      </div>
    `;

    await this.sendEmail({ to, subject, html });
  }

  /**
   * İndirim e-postası
   */
  async sendDiscountEmail(
    to: string,
    username: string,
    percent: number,
    code: string,
    validUntil?: string,
    landingUrl?: string
  ): Promise<void> {
    const subject = `Özel İndirim: ${percent}% fırsatı`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin:0 auto;">
        <h1 style="color:#28a745; text-align:center;">Özel İndirim!</h1>
        <p>Merhaba ${username},</p>
        <p>Sana özel ${percent}% indirim fırsatı!</p>
        <p><strong>Kupon Kodu:</strong> ${code}</p>
        ${validUntil ? `<p><strong>Geçerlilik:</strong> ${validUntil}</p>` : ''}
        ${landingUrl ? `
          <div style="text-align:center; margin:20px 0;">
            <a href="${landingUrl}" style="background:#28a745; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none;">Fırsatı Kullan</a>
          </div>
        ` : ''}
        <p>Keyifli yayınlar,</p>
        <p>WebsaChat Ekibi</p>
      </div>
    `;
    await this.sendEmail({ to, subject, html });
  }

  /**
   * Kampanya duyurusu
   */
  async sendCampaignAnnouncementEmail(
    to: string,
    username: string,
    title: string,
    description: string,
    ctaUrl?: string
  ): Promise<void> {
    const subject = `Yeni Kampanya: ${title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin:0 auto;">
        <h1 style="color:#007bff; text-align:center;">${title}</h1>
        <p>Merhaba ${username},</p>
        <p>${description}</p>
        ${ctaUrl ? `
          <div style="text-align:center; margin:20px 0;">
            <a href="${ctaUrl}" style="background:#007bff; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none;">Detayları Gör</a>
          </div>
        ` : ''}
        <p>WebsaChat Ekibi</p>
      </div>
    `;
    await this.sendEmail({ to, subject, html });
  }

  /**
   * 2FA doğrulama kodu
   */
  async sendTwoFactorCodeEmail(to: string, username: string, code: string): Promise<void> {
    const subject = 'İki Aşamalı Doğrulama Kodu';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin:0 auto;">
        <h1 style="color:#333; text-align:center;">2FA Kodu</h1>
        <p>Merhaba ${username},</p>
        <p>Girişinizi doğrulamak için kodunuz:</p>
        <div style="text-align:center; font-size:24px; font-weight:bold; letter-spacing:2px; margin:16px 0;">${code}</div>
        <p>Bu kod kısa süre içinde geçersiz olacaktır.</p>
        <p>WebsaChat Ekibi</p>
      </div>
    `;
    await this.sendEmail({ to, subject, html });
  }

  /**
   * 2FA etkinleştirildi bildirimi
   */
  async sendTwoFactorEnabledEmail(to: string, username: string): Promise<void> {
    const subject = 'İki Aşamalı Doğrulama Etkinleştirildi';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin:0 auto;">
        <h1 style="color:#333; text-align:center;">Güvenlik Güncellemesi</h1>
        <p>Merhaba ${username},</p>
        <p>Hesabınız için iki aşamalı doğrulama başarıyla etkinleştirildi.</p>
        <p>Artık girişleriniz ek güvenlik katmanı ile korunuyor.</p>
        <p>WebsaChat Ekibi</p>
      </div>
    `;
    await this.sendEmail({ to, subject, html });
  }

  /**
   * Giriş uyarısı (Yeni cihaz/IP)
   */
  async sendLoginAlertEmail(
    to: string,
    username: string,
    ip: string,
    location?: string,
    userAgent?: string
  ): Promise<void> {
    const subject = 'Giriş Uyarısı';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin:0 auto;">
        <h1 style="color:#ffc107; text-align:center;">Giriş Uyarısı</h1>
        <p>Merhaba ${username},</p>
        <p>Hesabınıza yeni bir cihaz/IP üzerinden giriş yapıldı.</p>
        <ul>
          <li><strong>IP:</strong> ${ip}</li>
          ${location ? `<li><strong>Konum:</strong> ${location}</li>` : ''}
          ${userAgent ? `<li><strong>Cihaz:</strong> ${userAgent}</li>` : ''}
        </ul>
        <p>Eğer bu işlem size ait değilse, lütfen şifrenizi değiştirin ve destek ekibiyle iletişime geçin.</p>
        <p>WebsaChat Ekibi</p>
      </div>
    `;
    await this.sendEmail({ to, subject, html });
  }

  /**
   * Canlı yayın hatırlatma
   */
  async sendLiveStreamReminderEmail(
    to: string,
    username: string,
    streamerName: string,
    scheduledAt: string,
    streamUrl: string
  ): Promise<void> {
    const subject = 'Canlı Yayın Hatırlatma';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin:0 auto;">
        <h1 style="color:#17a2b8; text-align:center;">Canlı Yayın Hatırlatma</h1>
        <p>Merhaba ${username},</p>
        <p><strong>${streamerName}</strong> adlı yayıncı ${scheduledAt} tarihinde canlı yayında olacak.</p>
        <div style="text-align:center; margin:20px 0;">
          <a href="${streamUrl}" style="background:#17a2b8; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none;">Yayına Git</a>
        </div>
        <p>WebsaChat Ekibi</p>
      </div>
    `;
    await this.sendEmail({ to, subject, html });
  }

  /**
   * Topluluk kuralları uyarısı
   */
  async sendCommunityGuidelineWarningEmail(
    to: string,
    username: string,
    issue: string,
    actions?: string
  ): Promise<void> {
    const subject = 'Topluluk Kuralları Uyarısı';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto;">
        <h1 style="color:#dc3545; text-align:center;">Uyarı</h1>
        <p>Merhaba ${username},</p>
        <p>Topluluk kurallarına aykırı bir durum tespit edildi:</p>
        <p><strong>Detay:</strong> ${issue}</p>
        ${actions ? `<p><strongYapılması gerekenler:</strong> ${actions}</p>` : ''}
        <p>Lütfen topluluk yönergelerini gözden geçiriniz.</p>
        <p>WebsaChat Moderasyon Ekibi</p>
      </div>
    `;
    await this.sendEmail({ to, subject, html });
  }

  /**
   * Yayın özeti
   */
  async sendStreamSummaryEmail(
    to: string,
    username: string,
    streamTitle: string,
    viewers: number,
    likes: number,
    duration: string,
    earnings?: string
  ): Promise<void> {
    const subject = 'Yayın Özeti';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto;">
        <h1 style="color:#333; text-align:center;">Yayın Özeti</h1>
        <p>Merhaba ${username},</p>
        <p><strong>Yayın:</strong> ${streamTitle}</p>
        <ul>
          <li><strong>İzleyici:</strong> ${viewers}</li>
          <li><strong>Beğeni:</strong> ${likes}</li>
          <li><strong>Süre:</strong> ${duration}</li>
          ${earnings ? `<li><strong>Kazanç:</strong> ${earnings}</li>` : ''}
        </ul>
        <p>WebsaChat Ekibi</p>
      </div>
    `;
    await this.sendEmail({ to, subject, html });
  }

  /**
   * Takipçi dönüm noktası
   */
  async sendFollowerMilestoneEmail(to: string, username: string, milestoneNumber: number): Promise<void> {
    const subject = `Tebrikler! ${milestoneNumber} takipçiyi aştınız`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto;">
        <h1 style="color:#28a745; text-align:center;">Tebrikler!</h1>
        <p>Merhaba ${username},</p>
        <p>${milestoneNumber} takipçi sayısına ulaştınız. Harika bir başarı!</p>
        <p>Topluluğunuzla birlikte büyümeye devam edin.</p>
        <p>WebsaChat Ekibi</p>
      </div>
    `;
    await this.sendEmail({ to, subject, html });
  }

  /**
   * Cüzdan işlem bildirimi
   */
  async sendWalletTransactionEmail(
    to: string,
    username: string,
    type: 'credit' | 'debit',
    amount: string,
    currency: string,
    reference: string,
    balanceAfter?: string
  ): Promise<void> {
    const subject = `Cüzdan İşlemi: ${type === 'credit' ? 'Yatırma' : 'Çekim'}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto;">
        <h1 style="color:#333; text-align:center;">Cüzdan İşlemi</h1>
        <p>Merhaba ${username},</p>
        <ul>
          <li><strong>Tür:</strong> ${type === 'credit' ? 'Yatırma' : 'Çekim'}</li>
          <li><strong>Tutar:</strong> ${amount} ${currency}</li>
          <li><strong>Ref No:</strong> ${reference}</li>
          ${balanceAfter ? `<li><strong>Yeni Bakiye:</strong> ${balanceAfter}</li>` : ''}
        </ul>
        <p>WebsaChat Ekibi</p>
      </div>
    `;
    await this.sendEmail({ to, subject, html });
  }

  /**
   * Bülten (özgür HTML içerik)
   */
  async sendNewsletterEmail(to: string, username: string, subject: string, htmlContent: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto;">
        <p>Merhaba ${username},</p>
        ${htmlContent}
        <p style="margin-top:24px;">WebsaChat Ekibi</p>
      </div>
    `;
    await this.sendEmail({ to, subject, html });
  }

  /**
   * Abonelik yenileme hatırlatma
   */
  async sendSubscriptionRenewalReminderEmail(
    to: string,
    username: string,
    planName: string,
    renewDate: string,
    manageUrl: string
  ): Promise<void> {
    const subject = 'Abonelik Yenileme Hatırlatma';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto;">
        <h1 style="color:#333; text-align:center;">Yenileme Hatırlatma</h1>
        <p>Merhaba ${username},</p>
        <p><strong>${planName}</strong> aboneliğiniz ${renewDate} tarihinde yenilenecektir.</p>
        <div style="text-align:center; margin:20px 0;">
          <a href="${manageUrl}" style="background:#6c757d; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none;">Aboneliği Yönet</a>
        </div>
        <p>WebsaChat Ekibi</p>
      </div>
    `;
    await this.sendEmail({ to, subject, html });
  }

  /**
   * Fatura/Alındı
   */
  async sendInvoiceReceiptEmail(
    to: string,
    username: string,
    amount: string,
    currency: string,
    invoiceNumber: string,
    downloadUrl?: string
  ): Promise<void> {
    const subject = 'Ödeme Alındı / Fatura';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto;">
        <h1 style="color:#333; text-align:center;">Ödeme Alındı</h1>
        <p>Merhaba ${username},</p>
        <ul>
          <li><strong>Tutar:</strong> ${amount} ${currency}</li>
          <li><strong>Fatura No:</strong> ${invoiceNumber}</li>
        </ul>
        ${downloadUrl ? `
          <div style="text-align:center; margin:20px 0;">
            <a href="${downloadUrl}" style="background:#007bff; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none;">Faturayı İndir</a>
          </div>
        ` : ''}
        <p>WebsaChat Ekibi</p>
      </div>
    `;
    await this.sendEmail({ to, subject, html });
  }

  /**
   * Hesap silme onayı
   */
  async sendAccountDeletionConfirmationEmail(to: string, username: string, scheduledDeletionDate?: string): Promise<void> {
    const subject = 'Hesap Silme Onayı';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto;">
        <h1 style="color:#dc3545; text-align:center;">Hesap Silme Onayı</h1>
        <p>Merhaba ${username},</p>
        <p>Hesabınızı silme talebiniz alınmıştır.${scheduledDeletionDate ? ` Planlanan tarih: ${scheduledDeletionDate}.` : ''}</p>
        <p>Bu işlem kalıcıdır. Geri almak için lütfen destek ekibiyle iletişime geçin.</p>
        <p>WebsaChat Ekibi</p>
      </div>
    `;
    await this.sendEmail({ to, subject, html });
  }

  /**
   * Veri dışa aktarma hazır
   */
  async sendDataExportReadyEmail(to: string, username: string, downloadUrl: string, expiresText?: string): Promise<void> {
    const subject = 'Veri Dışa Aktarma Hazır';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto;">
        <h1 style="color:#333; text-align:center;">Veri Dışa Aktarma Hazır</h1>
        <p>Merhaba ${username},</p>
        <p>Veri dışa aktarma dosyanız hazır.</p>
        <div style="text-align:center; margin:20px 0;">
          <a href="${downloadUrl}" style="background:#007bff; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none;">İndir</a>
        </div>
        ${expiresText ? `<p>Bağlantı ${expiresText} içinde geçersiz olacaktır.</p>` : ''}
        <p>WebsaChat Ekibi</p>
      </div>
    `;
    await this.sendEmail({ to, subject, html });
  }

  /**
   * Destek yanıtı
   */
  async sendSupportResponseEmail(
    to: string,
    username: string,
    ticketId: string,
    messagePreview: string,
    portalUrl: string
  ): Promise<void> {
    const subject = `Destek Yanıtı (#${ticketId})`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto;">
        <h1 style="color:#333; text-align:center;">Destek Yanıtı</h1>
        <p>Merhaba ${username},</p>
        <p>Destek talebinize yeni bir yanıt var:</p>
        <blockquote style="background:#f8f9fa; padding:12px; border-left:4px solid #007bff;">${messagePreview}</blockquote>
        <div style="text-align:center; margin:20px 0;">
          <a href="${portalUrl}" style="background:#007bff; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none;">Portalı Aç</a>
        </div>
        <p>WebsaChat Destek Ekibi</p>
      </div>
    `;
    await this.sendEmail({ to, subject, html });
  }

  /**
   * Rapor alındı bildirimi
   */
  async sendReportReceivedEmail(
    to: string,
    username: string,
    reportId: string,
    subjectText: string,
    status?: string
  ): Promise<void> {
    const subject = `Rapor Alındı (#${reportId})`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto;">
        <h1 style="color:#333; text-align:center;">Rapor Alındı</h1>
        <p>Merhaba ${username},</p>
        <p>Gönderdiğiniz rapor alındı:</p>
        <ul>
          <li><strong>Konu:</strong> ${subjectText}</li>
          ${status ? `<li><strong>Durum:</strong> ${status}</li>` : ''}
        </ul>
        <p>İnceleme tamamlandığında bilgilendirileceksiniz.</p>
        <p>WebsaChat Moderasyon Ekibi</p>
      </div>
    `;
    await this.sendEmail({ to, subject, html });
  }

  /**
   * Abonelik yenileme yaklaşırken hatırlatma
   */
  async sendSubscriptionRenewalApproachingEmail(
    to: string,
    username: string,
    planName: string,
    daysLeft: number,
    manageUrl: string
  ): Promise<void> {
    const subject = 'Abonelik Yenileme Yaklaşıyor';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto;">
        <h1 style="color:#333; text-align:center;">Yenileme Yaklaşıyor</h1>
        <p>Merhaba ${username},</p>
        <p><strong>${planName}</strong> aboneliğinizin yenilenmesine ${daysLeft} gün kaldı.</p>
        <div style="text-align:center; margin:20px 0;">
          <a href="${manageUrl}" style="background:#6c757d; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none;">Aboneliği Yönet</a>
        </div>
        <p>WebsaChat Ekibi</p>
      </div>
    `;
    await this.sendEmail({ to, subject, html });
  }

  /**
   * Fatura/ödeme hatırlatma
   */
  async sendInvoiceReminderEmail(
    to: string,
    username: string,
    invoiceNumber: string,
    dueDate: string,
    payUrl: string
  ): Promise<void> {
    const subject = `Fatura Hatırlatma (#${invoiceNumber})`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:0 auto;">
        <h1 style="color:#333; text-align:center;">Fatura Hatırlatma</h1>
        <p>Merhaba ${username},</p>
        <p>#${invoiceNumber} numaralı faturanızın son ödeme tarihi: ${dueDate}.</p>
        <div style="text-align:center; margin:20px 0;">
          <a href="${payUrl}" style="background:#28a745; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none;">Ödeme Yap</a>
        </div>
        <p>WebsaChat Ekibi</p>
      </div>
    `;
    await this.sendEmail({ to, subject, html });
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('Email service connection verified successfully');
      return true;
    } catch (error) {
      logger.error('Email service connection failed', { error });
      return false;
    }
  }

  private getPasswordResetExpiryDescription(): string {
    const raw = (process.env.PASSWORD_RESET_EXPIRES_IN ?? '30m').trim().toLowerCase();
    const match = raw.match(/^(\d+)\s*(ms|s|m|h|d)?$/);
    if (!match) return '30 minutes';

    const numStr = match[1] ?? '30';
    const unitRaw = match[2];
    const num = parseInt(numStr, 10);
    const unit = unitRaw ?? 'm';

    switch (unit) {
    case 'ms': return `${num} milliseconds`;
    case 's': return `${num} seconds`;
    case 'm': return `${num} minutes`;
    case 'h': return `${num} hour${num > 1 ? 's' : ''}`;
    case 'd': return `${num} day${num > 1 ? 's' : ''}`;
    default: return '30 minutes';
    }
  }
}

export const emailService = new EmailService();