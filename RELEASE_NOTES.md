# Release Notes

## Version 0.2.2 - March 28, 2026

### Summary

- Optimized large inboxes so active chat lists remain responsive at 3,500+ conversations.
- Added a summary-backed read model and virtualized sidebar rendering for the inbox.
- Fixed customer service window handling so outbound sends no longer extend the 24-hour timer and free-form sends are enforced server-side.
- Kept `Message` as the source of truth and made the summary layer rebuildable.

### Included Changes

- Added `ConversationSummary` and supporting indexes.
- Added admin backfill support at `/api/admin/conversation-summaries/backfill`.
- Refactored `/api/contacts` to read summaries instead of scanning the full message history.
- Updated send, template, webhook, and mark-read flows to keep summary rows and unread counts in sync.
- Updated SSE and store behavior so one chat row can be patched without forcing a full sidebar reload.

### Deployment Notes

- This rollout includes Prisma migrations.
- Run the normal deployment for the target environment, then run the summary backfill from an authenticated admin session.
- See [CLIENT_DEPLOYMENT_RUNBOOK.md](./CLIENT_DEPLOYMENT_RUNBOOK.md) for the exact rollout checklist.

### Breaking Changes

- No external API contract changes.

## Version 0.2.1 - March 25, 2026

### 🔧 Improvements

- Added GitHub Actions workflow for automated release publishing
- Updated package version and changelog links for the main repository

### 📝 Notes

- No database migration required
- This is a maintenance release for the main repository

---

## Version 0.2.0 - January 29, 2026

### 🎉 Major Features

#### Template Management System
We've added a comprehensive template management system that allows administrators to:
- View and manage all WhatsApp message templates from the admin panel
- Control which users and integrations can access each template
- Sync templates directly from WhatsApp Cloud API
- Templates are now accessible from the admin dropdown menu

**Security**: Templates are disabled by default for all non-admin users. Administrators must explicitly grant access to specific users or integrations.

#### Enhanced Template Message Display
- Users with permission now see the actual template content instead of placeholders
- Template variables are rendered with real values (e.g., `{{name}}` shows the actual name)
- Template attachments (images, documents) are now displayed in the chat interface
- Template previews appear correctly in the sidebar contact list

#### Document Message Support
- **Incoming Documents**: The system now properly receives and displays document messages sent by anyone
- **Outgoing Documents**: Documents sent via the UI/API now include proper filenames (no more "Untitled" documents)
- **Download Functionality**: Users can download documents directly from the chat interface
- **Metadata Preservation**: Document filenames and MIME types are preserved throughout the system

### 🔧 Improvements

#### Email System
- Fixed SMTP configuration to properly load credentials from `.env.local`
- Email sending now works correctly in Docker environments

#### Performance
- Added database index on `whatsappMessageId` for faster status update lookups
- Optimized worker thread limits in development environment

#### Developer Experience
- Enhanced logging for debugging document message status updates
- Better error messages and debugging information

### 🐛 Bug Fixes

- Fixed template permissions system (strict role checks)
- Fixed TypeScript errors in various routes
- Fixed Next.js 15 compatibility issues
- Fixed document message handler syntax error
- Fixed mark-as-read functionality
- Fixed various parsing and type errors

### 📋 Technical Details

**Database Changes:**
- Added `templateParameters` field to `Message` model for storing template variable values
- Added `allowedUserIds` and `allowedClientIds` fields to `Template` model
- Added index on `whatsappMessageId` in `Message` model

**API Changes:**
- New endpoints: `/api/admin/templates`, `/api/admin/templates/[id]/permissions`, `/api/admin/templates/sync`
- Enhanced `/api/messages` to render template content
- Enhanced `/api/contacts` to show template previews
- Enhanced `/api/webhook` to handle document messages

**Breaking Changes:**
- None

### 🔄 Migration Required

After deploying this version, run:
```bash
npx prisma migrate deploy
```

This will:
- Add the `templateParameters` field to messages
- Add template permission fields
- Add the `whatsappMessageId` index

### 📝 Full Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a complete list of all changes.

---

## Version 0.1.0 - January 7, 2026

### Initial Release

First production release of the WhatsApp Business Management system.

**Features:**
- User authentication and authorization
- WhatsApp message sending and receiving
- Contact management
- Customer service window management
- Real-time messaging via Server-Sent Events (SSE)
- Business number management
- Integration API for external clients
