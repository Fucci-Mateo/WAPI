# AWS SES Email Configuration Guide

This guide explains how to configure AWS SES (Simple Email Service) for sending password reset emails in the WABM application.

## Prerequisites

- AWS Account with SES access
- Domain verified in AWS SES
- IAM user with SES permissions

## Step 1: Set Up AWS SES

### 1.1 Verify Your Domain
1. Go to AWS SES Console
2. Navigate to "Verified identities"
3. Click "Create identity"
4. Select "Domain" and enter your domain (e.g., `your-domain.com`)
5. Follow the DNS verification process

### 1.2 Verify Email Address (for testing)
1. In "Verified identities", click "Create identity"
2. Select "Email address"
3. Enter your email address
4. Check your email and click the verification link

### 1.3 Request Production Access (if needed)
- If you're in the SES sandbox, request production access
- This allows sending emails to any address, not just verified ones

## Step 2: Create IAM User for SMTP

### 2.1 Create IAM User
1. Go to AWS IAM Console
2. Click "Users" → "Create user"
3. Username: `wabm-ses-smtp-user`
4. Select "Programmatic access"

### 2.2 Attach SES Policy
Create a custom policy with these permissions:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ses:SendEmail",
                "ses:SendRawEmail"
            ],
            "Resource": "*"
        }
    ]
}
```

### 2.3 Generate SMTP Credentials
1. In IAM, select your user
2. Go to "Security credentials" tab
3. Scroll to "SMTP credentials" section
4. Click "Generate SMTP credentials"
5. **Save these credentials** - they won't be shown again!

## Step 3: Configure Environment Variables

Add these environment variables to your `.env.local` file:

```env
# AWS SES Configuration
AWS_SES_REGION=us-east-1
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
SMTP_FROM=WABM System <noreply@your-domain.com>

# NextAuth (if not already set)
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key
```

## Step 4: Update Docker Configuration

### 4.1 Update docker-compose.dev.yml
Add the SES environment variables:

```yaml
environment:
  # Database
  DATABASE_URL: postgresql://wabm_user:wabm_password@postgres:5432/wabm_db_dev
  
  # AWS SES Email Configuration
  AWS_SES_REGION: ${AWS_SES_REGION:-us-east-1}
  SMTP_HOST: ${SMTP_HOST:-email-smtp.us-east-1.amazonaws.com}
  SMTP_PORT: ${SMTP_PORT:-587}
  SMTP_SECURE: ${SMTP_SECURE:-false}
  SMTP_USER: ${SMTP_USER}
  SMTP_PASS: ${SMTP_PASS}
  SMTP_FROM: ${SMTP_FROM:-WABM System <noreply@your-domain.com>}
  
  # Node Environment
  NODE_ENV: production
  PORT: 3000
```

### 4.2 Update docker-compose.yml (Production)
Add the same environment variables to your production configuration.

## Step 5: Test Email Configuration

### 5.1 Test API Endpoint
```bash
curl -X POST http://localhost:3001/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'
```

### 5.2 Test Password Reset Flow
1. Go to http://localhost:3001/auth/forgot-password
2. Enter a verified email address
3. Check your email for the reset link

## Step 6: Monitor and Troubleshoot

### 6.1 Check AWS SES Metrics
1. Go to AWS SES Console
2. Navigate to "Sending statistics"
3. Monitor bounce and complaint rates

### 6.2 Common Issues

**Issue: "Email address not verified"**
- Solution: Verify the sender email address in SES console

**Issue: "Message rejected"**
- Solution: Check if you're in SES sandbox mode
- Request production access if needed

**Issue: "Invalid credentials"**
- Solution: Regenerate SMTP credentials in IAM

**Issue: "Rate limit exceeded"**
- Solution: Check your sending limits in SES console

## Step 7: Production Considerations

### 7.1 Sending Limits
- **Sandbox**: 200 emails per day, 1 email per second
- **Production**: Request higher limits as needed

### 7.2 Bounce and Complaint Handling
- Set up SNS notifications for bounces and complaints
- Implement automatic suppression list management

### 7.3 DKIM Signing
- Enable DKIM signing for your domain
- This improves email deliverability

### 7.4 SPF Record
Add this SPF record to your domain's DNS:
```
v=spf1 include:amazonses.com ~all
```

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `AWS_SES_REGION` | AWS region for SES | `us-east-1` |
| `SMTP_HOST` | SES SMTP endpoint | `email-smtp.us-east-1.amazonaws.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_SECURE` | Use TLS | `false` |
| `SMTP_USER` | SES SMTP username | `AKIA...` |
| `SMTP_PASS` | SES SMTP password | `Ae...` |
| `SMTP_FROM` | From email address | `WABM System <noreply@your-domain.com>` |

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use IAM roles** in production (not access keys)
3. **Rotate credentials** regularly
4. **Monitor usage** and set up alerts
5. **Use least privilege** principle for IAM policies

## Troubleshooting Commands

```bash
# Test email service
curl -X POST http://localhost:3001/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Check application logs
docker-compose -f docker-compose.dev.yml logs wabm

# Test password reset
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "verified@example.com"}'
```

## Support

For AWS SES specific issues:
- AWS SES Documentation: https://docs.aws.amazon.com/ses/
- AWS Support: https://console.aws.amazon.com/support/

For application issues:
- Check application logs
- Verify environment variables
- Test with the provided API endpoints
