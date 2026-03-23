# Password Reset Feature Setup

This document explains how to set up and use the password reset feature in the WABM application.

## Features

- **Forgot Password**: Users can request a password reset by entering their email
- **Secure Reset Tokens**: Time-limited tokens (1 hour) for password reset
- **Email Notifications**: HTML email templates with reset links
- **Token Validation**: Server-side validation of reset tokens
- **Security**: Prevents email enumeration attacks

## Database Schema

The password reset feature uses a new `ResetToken` table:

```sql
CREATE TABLE "ResetToken" (
  id        TEXT PRIMARY KEY,
  token     TEXT UNIQUE NOT NULL,
  userId    TEXT NOT NULL,
  expires   TIMESTAMP(3) NOT NULL,
  used      BOOLEAN NOT NULL DEFAULT false,
  createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ResetToken_userId_fkey" FOREIGN KEY (userId) REFERENCES "User"(id) ON DELETE CASCADE
);
```

## Environment Variables

Add these environment variables to your `.env.local` file:

```env
# Email Configuration (required for password reset)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="WABM System <your-email@gmail.com>"

# NextAuth (required)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

## Email Provider Setup

### Gmail Setup
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
3. Use the app password in `SMTP_PASS`

### Other SMTP Providers
Update the SMTP configuration in `.env.local`:
- **Outlook/Hotmail**: `smtp-mail.outlook.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587`
- **Custom SMTP**: Use your provider's settings

## API Endpoints

### POST /api/auth/forgot-password
Request a password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

### POST /api/auth/reset-password
Reset password using a token.

**Request:**
```json
{
  "token": "reset-token-here",
  "password": "new-password",
  "confirmPassword": "new-password"
}
```

**Response:**
```json
{
  "message": "Password has been reset successfully. You can now log in with your new password."
}
```

### GET /api/auth/reset-password?token=...
Verify if a reset token is valid.

**Response:**
```json
{
  "valid": true,
  "email": "user@example.com",
  "name": "User Name"
}
```

## UI Pages

- **`/auth/forgot-password`**: Request password reset
- **`/auth/reset-password?token=...`**: Reset password with token
- **`/auth/signin`**: Sign in page (now includes "Forgot Password?" link)

## Security Features

1. **Email Enumeration Protection**: Always returns success message regardless of email existence
2. **Token Expiration**: Reset tokens expire after 1 hour
3. **Single Use**: Tokens can only be used once
4. **Secure Tokens**: 32-byte random tokens
5. **User Validation**: Only active users can reset passwords
6. **Token Cleanup**: Expired and used tokens are automatically cleaned up

## Testing

### Test Email Service
```bash
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### Test Password Reset Flow
1. Go to `/auth/forgot-password`
2. Enter a valid user email
3. Check email for reset link
4. Click the link to go to reset page
5. Enter new password
6. Sign in with new password

## Troubleshooting

### Email Not Sending
1. Check SMTP credentials in `.env.local`
2. Verify email provider settings
3. Check application logs for errors
4. Test with `/api/test-email` endpoint

### Token Issues
1. Ensure database migration ran successfully
2. Check token expiration (1 hour limit)
3. Verify token hasn't been used already
4. Check user account is active

### Database Issues
1. Run Prisma migration: `npx prisma migrate dev`
2. Check database connection
3. Verify ResetToken table exists

## Development Notes

- The email service uses Nodemailer
- Reset tokens are stored in the database with expiration
- Email templates are HTML with fallback text
- All API responses are consistent to prevent information leakage
- The feature integrates seamlessly with NextAuth.js
