# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.2] - 2026-03-28

### Added
- `ConversationSummary` derived read model for active chat lists, plus an admin backfill endpoint at `/api/admin/conversation-summaries/backfill`.
- WhatsApp identity scope migration support for phone-based and business-scoped user identities in shared inbox lookups.

### Changed
- `/api/contacts` now reads from conversation summaries and hydrates template previews from a single preloaded template map instead of scanning the full `Message` table.
- Sidebar rendering now uses virtualization and debounced search so large inboxes remain responsive with thousands of active chats.
- SSE and Zustand active-chat updates now patch individual chat rows instead of forcing full list refreshes.
- Message send, template send, webhook receive, and mark-read flows now keep conversation summaries and unread counts synchronized.

### Fixed
- Slow inbox loads and browser hangs for tenants with 3,500+ active chats.
- Stale unread counts, ordering, and last-message previews after inbound messages, template sends, and mark-read events.
- Customer service window free-form sending now stays aligned with the 24-hour inbound timer, and outbound sends no longer extend the window.

## [0.2.1] - 2026-03-25

### Added
- GitHub Actions workflow for automated release publishing.

### Changed
- Version metadata updated to `0.2.2`.
- Changelog links now point at the main repository.

## [0.2.0] - 2026-01-29

### Added
- **Template Management System**: Complete template management with permissions
  - Admin UI for managing WhatsApp message templates
  - Template permissions system (user-level and integration-level access control)
  - Template sync from WhatsApp Cloud API
  - Templates accessible from admin dropdown menu
  - Templates disabled by default for all non-admin users
- **Template Message Rendering**: Enhanced template message display
  - Show actual template content instead of `[Template: name]` placeholder
  - Render template variables with actual values for users with permission
  - Support for named template variables (e.g., `{{name}}`)
  - Display template attachments (images, documents) in chat interface
  - Template content preview in sidebar contact list
- **Document Message Support**: Full document message handling
  - Receive and display incoming document messages
  - Send documents with proper filename (no more "Untitled" documents)
  - Document download functionality in chat interface
  - Document metadata (filename, MIME type) preservation
- **Enhanced Logging**: Improved debugging capabilities
  - Enhanced logging for document message status updates
  - WhatsApp message ID tracking for status updates
  - Debug logging for template permission checks

### Changed
- **Template Permissions**: Templates are now disabled by default for all non-admin users
- **SMTP Configuration**: Fixed environment variable handling to properly load credentials from `.env.local`
- **Database Schema**: Added index on `whatsappMessageId` for improved status update performance
- **Business Number Management**: Refactored to use dedicated `BusinessNumber` model

### Fixed
- Fixed SMTP email sending (credentials now properly loaded from `.env.local`)
- Fixed template permissions: strict role checks and empty array handling
- Fixed TypeScript errors in sync route
- Fixed Next.js 15 route params type handling
- Fixed admin templates page clients fetch parsing
- Fixed missing closing brace in document message handler
- Fixed mark-as-read functionality for unread messages
- Fixed duplicate variable declaration in seed.js
- Fixed document filename display (recipients now see correct file names)

### Infrastructure
- Added worker thread limits to dev environment for CPU optimization
- Improved Docker Compose environment variable handling

## [0.1.0] - 2026-01-07

### Initial Release
- Basic WhatsApp Business Management functionality
- User authentication and authorization
- Message sending and receiving
- Contact management
- Customer service window management
- Real-time messaging via SSE

[Unreleased]: https://github.com/CodeZ24/WABM/compare/v0.2.2...HEAD
[0.2.2]: https://github.com/CodeZ24/WABM/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/CodeZ24/WABM/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/CodeZ24/WABM/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/CodeZ24/WABM/releases/tag/v0.1.0
