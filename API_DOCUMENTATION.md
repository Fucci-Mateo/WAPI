# WhatsApp Business API Documentation

This document provides comprehensive API documentation for sending messages and uploading media through the WhatsApp Business API integration.

## Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Media Upload](#media-upload)
- [Sending Messages](#sending-messages)
- [File Types and Limits](#file-types-and-limits)
- [Error Handling](#error-handling)

---

## Base URL

**Development:** `https://your-staging-domain.com`  
**Production:** `https://your-production-domain.com`

---

## Authentication

### External API Authentication

External API endpoints require authentication using an API key in the request header:

```
X-API-Key: your_api_key_here
```

**Required Scope:** `messages:send` (for sending messages and uploading media)

**Number ID Selection:**
- Can be provided via header: `X-Number-Id: your_number_id`
- Can be provided via query parameter: `?numberId=your_number_id`
- Falls back to client's default number ID if configured

---

## Media Upload

### Internal Media Upload

Upload media files to get a media ID for sending messages.

**Endpoint:** `POST /api/media/upload`

**Authentication:** None (internal use only)

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `file`: The media file to upload
  - `numberId`: WhatsApp Business Phone Number ID

**Response:**
```json
{
  "mediaId": "123456789",
  "mediaType": "image",
  "mimeType": "image/jpeg",
  "fileName": "photo.jpg",
  "fileSize": 245678
}
```

**Example:**
```bash
curl -X POST https://your-staging-domain.com/api/media/upload \
  -F "file=@/path/to/image.jpg" \
  -F "numberId=your_number_id"
```

### External Media Upload

Upload media files via the external API (requires authentication).

**Endpoint:** `POST /api/v1/ext/media/upload`

**Authentication:** Required (API key)

**Request:**
- Headers:
  - `X-API-Key`: Your API key
  - `X-Number-Id`: (Optional) WhatsApp Business Phone Number ID
- Content-Type: `multipart/form-data`
- Body:
  - `file`: The media file to upload

**Response:**
```json
{
  "mediaId": "123456789",
  "mediaType": "image",
  "mimeType": "image/jpeg",
  "fileName": "photo.jpg",
  "fileSize": 245678
}
```

**Examples:**

Upload image:
```bash
curl -X POST https://your-staging-domain.com/api/v1/ext/media/upload \
  -H "X-API-Key: wak_your_api_key_here" \
  -H "X-Number-Id: your_number_id" \
  -F "file=@/path/to/image.jpg"
```

Upload audio:
```bash
curl -X POST https://your-staging-domain.com/api/v1/ext/media/upload \
  -H "X-API-Key: wak_your_api_key_here" \
  -H "X-Number-Id: your_number_id" \
  -F "file=@/path/to/audio.mp3"
```

Upload document:
```bash
curl -X POST https://your-staging-domain.com/api/v1/ext/media/upload \
  -H "X-API-Key: wak_your_api_key_here" \
  -H "X-Number-Id: your_number_id" \
  -F "file=@/path/to/document.pdf"
```

Using query parameter for numberId:
```bash
curl -X POST "https://your-staging-domain.com/api/v1/ext/media/upload?numberId=your_number_id" \
  -H "X-API-Key: wak_your_api_key_here" \
  -F "file=@/path/to/image.jpg"
```

---

## Sending Messages

### Internal Send Message

Send text or media messages (internal API).

**Endpoint:** `POST /api/send`

**Authentication:** None (internal use only)

**Request Body (Text Message):**
```json
{
  "to": "1234567890",
  "text": "Hello, this is a test message!",
  "numberId": "your_number_id"
}
```

**Request Body (Media Message):**
```json
{
  "to": "1234567890",
  "numberId": "your_number_id",
  "mediaId": "123456789",
  "mediaType": "image",
  "caption": "Check out this image!",
  "fileName": "photo.jpg",
  "mimeType": "image/jpeg"
}
```

**Response:**
```json
{
  "messages": [
    {
      "id": "wamid.xxx"
    }
  ]
}
```

**Examples:**

Send text message:
```bash
curl -X POST https://your-staging-domain.com/api/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "1234567890",
    "text": "Hello, this is a test message!",
    "numberId": "your_number_id"
  }'
```

Send image with caption:
```bash
curl -X POST https://your-staging-domain.com/api/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "1234567890",
    "numberId": "your_number_id",
    "mediaId": "123456789",
    "mediaType": "image",
    "caption": "Check out this image!",
    "fileName": "photo.jpg",
    "mimeType": "image/jpeg"
  }'
```

Send audio (no caption):
```bash
curl -X POST https://your-staging-domain.com/api/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "1234567890",
    "numberId": "your_number_id",
    "mediaId": "123456789",
    "mediaType": "audio",
    "fileName": "audio.mp3",
    "mimeType": "audio/mpeg"
  }'
```

Send document with caption:
```bash
curl -X POST https://your-staging-domain.com/api/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "1234567890",
    "numberId": "your_number_id",
    "mediaId": "123456789",
    "mediaType": "document",
    "caption": "Please review this document",
    "fileName": "report.pdf",
    "mimeType": "application/pdf"
  }'
```

### External Send Message (Forward)

Send messages via the external API (requires authentication). This endpoint forwards requests directly to WhatsApp's Graph API.

**Endpoint:** `POST /api/v1/ext/forward`

**Authentication:** Required (API key)

**Request Headers:**
- `X-API-Key`: Your API key
- `X-Number-Id`: (Optional) WhatsApp Business Phone Number ID
- `Idempotency-Key`: (Optional) Unique key for idempotent requests
- `Content-Type`: `application/json`

**Request Body (Text Message):**
```json
{
  "messaging_product": "whatsapp",
  "to": "1234567890",
  "type": "text",
  "text": {
    "body": "Hello, this is a test message!"
  }
}
```

**Request Body (Image Message):**
```json
{
  "messaging_product": "whatsapp",
  "to": "1234567890",
  "type": "image",
  "image": {
    "id": "123456789",
    "caption": "Check out this image!"
  }
}
```

**Request Body (Audio Message):**
```json
{
  "messaging_product": "whatsapp",
  "to": "1234567890",
  "type": "audio",
  "audio": {
    "id": "123456789"
  }
}
```

**Request Body (Document Message):**
```json
{
  "messaging_product": "whatsapp",
  "to": "1234567890",
  "type": "document",
  "document": {
    "id": "123456789",
    "caption": "Please review this document"
  }
}
```

**Response:**
```json
{
  "messages": [
    {
      "id": "wamid.xxx"
    }
  ]
}
```

**Examples:**

Send text message:
```bash
curl -X POST https://your-staging-domain.com/api/v1/ext/forward \
  -H "X-API-Key: wak_your_api_key_here" \
  -H "X-Number-Id: your_number_id" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "1234567890",
    "type": "text",
    "text": {
      "body": "Hello, this is a test message!"
    }
  }'
```

Send image with caption:
```bash
curl -X POST https://your-staging-domain.com/api/v1/ext/forward \
  -H "X-API-Key: wak_your_api_key_here" \
  -H "X-Number-Id: your_number_id" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "1234567890",
    "type": "image",
    "image": {
      "id": "123456789",
      "caption": "Check out this image!"
    }
  }'
```

Send audio:
```bash
curl -X POST https://your-staging-domain.com/api/v1/ext/forward \
  -H "X-API-Key: wak_your_api_key_here" \
  -H "X-Number-Id: your_number_id" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "1234567890",
    "type": "audio",
    "audio": {
      "id": "123456789"
    }
  }'
```

Send document with caption:
```bash
curl -X POST https://your-staging-domain.com/api/v1/ext/forward \
  -H "X-API-Key: wak_your_api_key_here" \
  -H "X-Number-Id: your_number_id" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "1234567890",
    "type": "document",
    "document": {
      "id": "123456789",
      "caption": "Please review this document"
    }
  }'
```

With idempotency key:
```bash
curl -X POST https://your-staging-domain.com/api/v1/ext/forward \
  -H "X-API-Key: wak_your_api_key_here" \
  -H "X-Number-Id: your_number_id" \
  -H "Idempotency-Key: unique-request-id-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "1234567890",
    "type": "text",
    "text": {
      "body": "Hello, this is a test message!"
    }
  }'
```

### External Send Template Message

Send template messages via the external API (requires authentication). This endpoint provides a simplified interface for sending WhatsApp template messages.

**Endpoint:** `POST /api/v1/ext/send-template`

**Authentication:** Required (API key)

**Request Headers:**
- `X-API-Key`: Your API key
- `X-Number-Id`: (Optional) WhatsApp Business Phone Number ID
- `Idempotency-Key`: (Optional) Unique key for idempotent requests
- `Content-Type`: `application/json`

**Request Body:**
```json
{
  "to": "1234567890",
  "templateName": "hello_world",
  "language": "en",
  "components": [
    {
      "type": "BODY",
      "parameters": [
        {
          "type": "text",
          "text": "John Doe"
        }
      ]
    }
  ]
}
```

**Request Body Fields:**
- `to` (required): Recipient phone number (with country code, no + prefix)
- `templateName` (required): Name of the approved template
- `language` (required): Language code (e.g., "en", "en_US")
- `components` (optional): Array of template components with parameters

**Component Types:**
- `HEADER`: Header component (can contain text, image, video, or document)
- `BODY`: Body component (contains text parameters)
- `FOOTER`: Footer component (rarely has parameters)
- `BUTTONS`: Button component (for interactive templates)

**Parameter Types:**
- `text`: Text parameter
  ```json
  {
    "type": "text",
    "text": "value",
    "parameter_name": "variable_name"  // Required for named parameters
  }
  ```
- `image`: Image media parameter
  ```json
  {
    "type": "image",
    "image": {
      "id": "media_id_here"
    }
  }
  ```
- `video`: Video media parameter
  ```json
  {
    "type": "video",
    "video": {
      "id": "media_id_here"
    }
  }
  ```
- `document`: Document media parameter
  ```json
  {
    "type": "document",
    "document": {
      "id": "media_id_here"
    }
  }
  ```
- `currency`: Currency parameter
  ```json
  {
    "type": "currency",
    "currency": {
      "code": "USD",
      "amount_1000": 10000
    },
    "fallback_value": "10.00"
  }
  ```
- `date_time`: Date/time parameter
  ```json
  {
    "type": "date_time",
    "date_time": {
      "component": "BOTH",
      "day_of_month": 15,
      "month": 11,
      "year": 2025,
      "hour": 14,
      "minute": 30
    },
    "fallback_value": "2025-11-15T14:30:00Z"
  }
  ```

**Response:**
```json
{
  "messages": [
    {
      "id": "wamid.xxx"
    }
  ]
}
```

**Examples:**

Send template without variables:
```bash
curl -X POST https://your-staging-domain.com/api/v1/ext/send-template \
  -H "X-API-Key: wak_your_api_key_here" \
  -H "X-Number-Id: your_number_id" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "1234567890",
    "templateName": "hello_world",
    "language": "en"
  }'
```

Send template with text variables:
```bash
curl -X POST https://your-staging-domain.com/api/v1/ext/send-template \
  -H "X-API-Key: wak_your_api_key_here" \
  -H "X-Number-Id: your_number_id" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "1234567890",
    "templateName": "document_template",
    "language": "en",
    "components": [
      {
        "type": "BODY",
        "parameters": [
          {
            "type": "text",
            "text": "John Doe"
          },
          {
            "type": "text",
            "text": "Oct 2025"
          }
        ]
      }
    ]
  }'
```

Send template with named parameters:
```bash
curl -X POST https://your-staging-domain.com/api/v1/ext/send-template \
  -H "X-API-Key: wak_your_api_key_here" \
  -H "X-Number-Id: your_number_id" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "1234567890",
    "templateName": "document_template",
    "language": "en",
    "components": [
      {
        "type": "BODY",
        "parameters": [
          {
            "type": "text",
            "text": "John Doe",
            "parameter_name": "employee_name"
          },
          {
            "type": "text",
            "text": "Oct 2025",
            "parameter_name": "month_year"
          }
        ]
      }
    ]
  }'
```

Send template with media header:
```bash
# First, upload the media
MEDIA_RESPONSE=$(curl -X POST https://your-staging-domain.com/api/v1/ext/media/upload \
  -H "X-API-Key: wak_your_api_key_here" \
  -H "X-Number-Id: your_number_id" \
  -F "file=@/path/to/document.pdf")

MEDIA_ID=$(echo $MEDIA_RESPONSE | jq -r '.mediaId')

# Then send template with media header
 curl -X POST https://your-staging-domain.com/api/v1/ext/send-template \
  -H "X-API-Key: wak_your_api_key_here" \
  -H "X-Number-Id: your_number_id" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your_recipient_phone",
    "templateName": "document_template",
    "language": "en",
    "components": [
      {
        "type": "HEADER",
        "parameters": [
          {
            "type": "document",
            "document": {
              "id": "1505696023820527"
            }
          }
        ]
      },
      {
        "type": "BODY",
        "parameters": [
          {
            "type": "text",
            "text": "Sample User",
            "parameter_name": "employee_name"
          },
          {
            "type": "text",
            "text": "Oct 2025",
            "parameter_name": "month_year"
          }
        ]
      }
    ]
  }'
```

With idempotency key:
```bash
curl -X POST https://your-staging-domain.com/api/v1/ext/send-template \
  -H "X-API-Key: wak_your_api_key_here" \
  -H "X-Number-Id: your_number_id" \
  -H "Idempotency-Key: template-request-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "1234567890",
    "templateName": "hello_world",
    "language": "en"
  }'
```

### Complete Workflow: Upload and Send Media

**Step 1: Upload media**
```bash
MEDIA_RESPONSE=$(curl -X POST https://your-staging-domain.com/api/v1/ext/media/upload \
  -H "X-API-Key: wak_your_api_key_here" \
  -H "X-Number-Id: your_number_id" \
  -F "file=@/path/to/image.jpg")

MEDIA_ID=$(echo $MEDIA_RESPONSE | jq -r '.mediaId')
MEDIA_TYPE=$(echo $MEDIA_RESPONSE | jq -r '.mediaType')
FILE_NAME=$(echo $MEDIA_RESPONSE | jq -r '.fileName')
MIME_TYPE=$(echo $MEDIA_RESPONSE | jq -r '.mimeType')
```

**Step 2: Send message with media**
```bash
curl -X POST https://your-staging-domain.com/api/v1/ext/forward \
  -H "X-API-Key: wak_your_api_key_here" \
  -H "X-Number-Id: your_number_id" \
  -H "Content-Type: application/json" \
  -d "{
    \"messaging_product\": \"whatsapp\",
    \"to\": \"1234567890\",
    \"type\": \"$MEDIA_TYPE\",
    \"$MEDIA_TYPE\": {
      \"id\": \"$MEDIA_ID\",
      \"caption\": \"Check out this $MEDIA_TYPE!\"
    }
  }"
```

---

## File Types and Limits

### Supported Image Types
- `image/jpeg`
- `image/jpg`
- `image/png`

**Maximum Size:** 5 MB

### Supported Audio Types
- `audio/aac`
- `audio/mp4`
- `audio/mpeg`
- `audio/amr`
- `audio/ogg`

**Maximum Size:** 16 MB

**Note:** Audio messages do not support captions.

### Supported Document Types
- `application/pdf`
- `application/msword` (.doc)
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (.docx)
- `application/vnd.ms-powerpoint` (.ppt)
- `application/vnd.openxmlformats-officedocument.presentationml.presentation` (.pptx)
- `application/vnd.ms-excel` (.xls)
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (.xlsx)

**Maximum Size:** 100 MB

---

## Error Handling

### Common Error Responses

**401 Unauthorized**
```json
{
  "error": "Unauthorized"
}
```
*Missing or invalid API key*

**403 Forbidden**
```json
{
  "error": "Forbidden - missing required scope: messages:send"
}
```
*API key doesn't have required scope*

**400 Bad Request - Missing File**
```json
{
  "error": "No file provided"
}
```

**400 Bad Request - Unsupported File Type**
```json
{
  "error": "Unsupported file type",
  "details": "Supported types: images (image/jpeg, image/jpg, image/png), audio (audio/aac, audio/mp4, audio/mpeg, audio/amr, audio/ogg), documents (application/pdf, ...)"
}
```

**400 Bad Request - File Too Large**
```json
{
  "error": "File too large",
  "details": "Maximum size for image is 5MB"
}
```

**400 Bad Request - Missing numberId**
```json
{
  "error": "numberId is required (header X-Number-Id or client default)"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error",
  "details": "Error message details"
}
```

### Error Response Format

All error responses follow this structure:
```json
{
  "error": "Error message",
  "details": "Additional error details (optional)"
}
```

---

## Phone Number Format

Phone numbers should be provided in international format without the `+` sign:

- ✅ Correct: `1234567890` (for US number +1 234-567-8900)
- ✅ Correct: `49123456789` (for German number +49 123 456789)
- ❌ Incorrect: `+1234567890`
- ❌ Incorrect: `(123) 456-7890`

The API will automatically normalize phone numbers to the E.164 format required by WhatsApp.

---

## Notes

1. **Media Upload First:** Always upload media files first to get a `mediaId`, then use that ID when sending messages.

2. **Captions:**
   - Images: Captions are supported (optional)
   - Documents: Captions are supported (optional)
   - Audio: Captions are NOT supported by WhatsApp

3. **Idempotency:** The external forward endpoint supports idempotency keys via the `Idempotency-Key` header. If you send the same key twice, you'll get the same response without creating a duplicate message.

4. **Rate Limiting:** Each client has a configurable rate limit per minute. Check with your administrator for your specific limits.

5. **Customer Service Window:** Messages sent outside the 24-hour customer service window will fail unless you're using an approved message template.

---

## Support

For issues or questions, please contact your system administrator or refer to the main project documentation.
