# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: <your-repository-url>/compare/v0.2.0...HEAD
[0.2.0]: <your-repository-url>/compare/v0.1.0...v0.2.0
[0.1.0]: <your-repository-url>/releases/tag/v0.1.0
