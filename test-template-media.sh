#!/bin/bash

# Test Template with Media Header (Example 4)
# Usage: ./test-template-media.sh <recipient_phone_number> <path_to_media_file>

API_KEY="wak_your_api_key_here"
BASE_URL="https://your-staging-domain.com"
NUMBER_ID="your_number_id"

# Check arguments
if [ $# -lt 2 ]; then
    echo "Usage: $0 <recipient_phone_number> <path_to_media_file>"
    echo "Example: $0 your_recipient_phone /path/to/document.pdf"
    exit 1
fi

TO=$1
MEDIA_FILE=$2

# Validate file exists
if [ ! -f "$MEDIA_FILE" ]; then
    echo "Error: Media file not found: $MEDIA_FILE"
    exit 1
fi

echo "📤 Step 1: Uploading media file..."
echo "File: $MEDIA_FILE"
echo ""

# Step 1: Upload media
MEDIA_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/v1/ext/media/upload" \
  -H "X-API-Key: ${API_KEY}" \
  -H "X-Number-Id: ${NUMBER_ID}" \
  -F "file=@${MEDIA_FILE}")

echo "Upload Response:"
echo "$MEDIA_RESPONSE" | jq '.' 2>/dev/null || echo "$MEDIA_RESPONSE"
echo ""

# Extract media ID
MEDIA_ID=$(echo "$MEDIA_RESPONSE" | jq -r '.mediaId' 2>/dev/null)

if [ -z "$MEDIA_ID" ] || [ "$MEDIA_ID" = "null" ]; then
    echo "❌ Error: Failed to get media ID from upload response"
    exit 1
fi

echo "✅ Media uploaded successfully!"
echo "Media ID: $MEDIA_ID"
echo ""
echo "📨 Step 2: Sending template with media header..."
echo ""

# Step 2: Send template with media
TEMPLATE_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/v1/ext/send-template" \
  -H "X-API-Key: ${API_KEY}" \
  -H "X-Number-Id: ${NUMBER_ID}" \
  -H "Content-Type: application/json" \
  -d "{
    \"to\": \"${TO}\",
    \"templateName\": \"document_template\",
    \"language\": \"en\",
    \"components\": [
      {
        \"type\": \"HEADER\",
        \"parameters\": [
          {
            \"type\": \"document\",
            \"document\": {
              \"id\": \"${MEDIA_ID}\"
            }
          }
        ]
      },
      {
        \"type\": \"BODY\",
        \"parameters\": [
          {
            \"type\": \"text\",
            \"text\": \"Sample User\"
          },
          {
            \"type\": \"text\",
            \"text\": \"Oct 2025\"
          }
        ]
      }
    ]
  }")

echo "Template Response:"
echo "$TEMPLATE_RESPONSE" | jq '.' 2>/dev/null || echo "$TEMPLATE_RESPONSE"
echo ""

# Check if successful
if echo "$TEMPLATE_RESPONSE" | jq -e '.messages[0].id' > /dev/null 2>&1; then
    MESSAGE_ID=$(echo "$TEMPLATE_RESPONSE" | jq -r '.messages[0].id')
    echo "✅ Template sent successfully!"
    echo "Message ID: $MESSAGE_ID"
else
    echo "❌ Error sending template"
    exit 1
fi


