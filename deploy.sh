#!/bin/bash

# WABM Deployment Script
# Usage: ./deploy.sh [prd|dev]

ENV=${1:-prd}

case $ENV in
  "prd")
    echo "🚀 Deploying to PRODUCTION environment..."
    docker-compose -f docker-compose.prd.yml down
    docker-compose -f docker-compose.prd.yml build --no-cache
    docker-compose -f docker-compose.prd.yml up -d
    echo "✅ Production deployment complete!"
    echo "🌐 Production URL: https://your-production-domain.com"
    ;;
  "dev")
    echo "🚀 Deploying to DEVELOPMENT environment..."
    docker-compose -f docker-compose.dev.yml down
    docker-compose -f docker-compose.dev.yml build --no-cache
    docker-compose -f docker-compose.dev.yml up -d
    echo "✅ Development deployment complete!"
    echo "🌐 Development URL: https://your-staging-domain.com"
    ;;
  *)
    echo "❌ Invalid environment. Use 'prd' or 'dev'"
    echo "Usage: ./deploy.sh [prd|dev]"
    exit 1
    ;;
esac

echo ""
echo "📊 Container Status:"
docker ps --filter "name=wabm" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
