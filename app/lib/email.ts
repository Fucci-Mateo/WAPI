import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'email-smtp.us-east-1.amazonaws.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER, // AWS SES SMTP username
      pass: process.env.SMTP_PASS, // AWS SES SMTP password
    },
    // AWS SES specific configuration
    ...(process.env.AWS_SES_REGION && {
      host: `email-smtp.${process.env.AWS_SES_REGION}.amazonaws.com`,
    }),
  });

  return transporter;
}

export interface PasswordResetEmailData {
  to: string;
  resetToken: string;
  userName?: string;
}

export async function sendPasswordResetEmail({
  to,
  resetToken,
  userName = 'User',
}: PasswordResetEmailData): Promise<boolean> {
  try {
    const transporter = getTransporter();
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.SMTP_FROM || `"WABM System" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Password Reset Request - WABM',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset Request</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #2D3748;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background-color: #f7fafc;
              padding: 30px;
              border-radius: 0 0 8px 8px;
            }
            .button {
              display: inline-block;
              background-color: #3182ce;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
            }
            .button:hover {
              background-color: #2c5aa0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              font-size: 14px;
              color: #718096;
            }
            .warning {
              background-color: #fed7d7;
              border: 1px solid #feb2b2;
              color: #c53030;
              padding: 15px;
              border-radius: 6px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>WABM Password Reset</h1>
          </div>
          <div class="content">
            <h2>Hello ${userName},</h2>
            <p>We received a request to reset your password for your WABM account. If you made this request, click the button below to reset your password:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #edf2f7; padding: 10px; border-radius: 4px;">
              ${resetUrl}
            </p>
            
            <div class="warning">
              <strong>Important:</strong>
              <ul>
                <li>This link will expire in 1 hour for security reasons</li>
                <li>If you didn't request this password reset, please ignore this email</li>
                <li>Your password will not be changed until you click the link above</li>
              </ul>
            </div>
            
            <p>If you have any questions or need assistance, please contact your system administrator.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from the WABM system. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} WABM - WhatsApp Business Management System</p>
          </div>
        </body>
        </html>
      `,
      text: `
        Password Reset Request - WABM
        
        Hello ${userName},
        
        We received a request to reset your password for your WABM account. If you made this request, click the link below to reset your password:
        
        ${resetUrl}
        
        Important:
        - This link will expire in 1 hour for security reasons
        - If you didn't request this password reset, please ignore this email
        - Your password will not be changed until you click the link above
        
        If you have any questions or need assistance, please contact your system administrator.
        
        This is an automated message from the WABM system. Please do not reply to this email.
        
        © ${new Date().getFullYear()} WABM - WhatsApp Business Management System
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    return false;
  }
}

// Test email function for development
export async function sendTestEmail(to: string): Promise<boolean> {
  try {
    const transporter = getTransporter();
    const mailOptions = {
      from: process.env.SMTP_FROM || `"WABM System" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Test Email - WABM',
      text: 'This is a test email from WABM system.',
      html: '<p>This is a test email from WABM system.</p>',
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send test email:', error);
    return false;
  }
}
