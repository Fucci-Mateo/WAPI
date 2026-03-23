#!/bin/bash

# Generate SSL certificates for WABM Docker development
# This script creates self-signed certificates for local development

echo "🔐 Generating SSL certificates for WABM..."

# Create SSL directory if it doesn't exist
mkdir -p ssl

# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem \
  -out ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=WABM/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

# Set proper permissions
chmod 600 ssl/key.pem
chmod 644 ssl/cert.pem

echo "✅ SSL certificates generated successfully!"
echo "📁 Certificates saved to: ssl/cert.pem and ssl/key.pem"
echo "⚠️  Note: These are self-signed certificates for development only"
echo "🚀 You can now start the Docker environment with SSL support" 