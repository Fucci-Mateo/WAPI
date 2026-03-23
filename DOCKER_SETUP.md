# 🐳 WABM Docker Setup Guide

## 📋 **Overview**

WABM is now fully containerized with Docker, providing:

- ✅ **Complete application stack** (App + PostgreSQL + Nginx)
- ✅ **Development and production** configurations
- ✅ **Hot reloading** for development
- ✅ **Persistent data storage** with Docker volumes
- ✅ **Load balancing** and SSL termination with Nginx
- ✅ **Easy deployment** to any Docker host

## 🚀 **Quick Start**

### **Development Environment**
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up --build

# Access the application
open http://localhost:3000
```

### **Production Environment**
```bash
# Start production environment
docker-compose up --build

# Access the application
open http://localhost:3000
```

## 📁 **Docker Files Structure**

```
WABM/
├── Dockerfile              # Production build
├── Dockerfile.dev          # Development build
├── docker-compose.yml      # Production stack
├── docker-compose.dev.yml  # Development stack
├── .dockerignore           # Docker ignore rules
├── nginx.conf              # Nginx configuration
├── init-db.sql            # Database initialization
└── ssl/                   # SSL certificates (create this)
    ├── cert.pem
    └── key.pem
```

## 🔧 **Services Overview**

### **🏗️ WABM Application**
- **Image**: Custom Node.js 18 Alpine
- **Port**: 3000
- **Features**: Next.js with Prisma ORM
- **Environment**: Production/Development configs

### **🗄️ PostgreSQL Database**
- **Image**: postgres:15-alpine
- **Port**: 5432
- **Database**: wabm_db / wabm_db_dev
- **User**: wabm_user
- **Password**: wabm_password
- **Features**: ACID compliance, optimized indexes



### **🌐 Nginx Reverse Proxy**
- **Image**: nginx:alpine
- **Ports**: 80 (HTTP), 443 (HTTPS)
- **Features**: SSL termination, rate limiting, compression

## 🛠️ **Setup Instructions**

### **1. Environment Configuration**

Create `.env.local` with your WhatsApp API credentials:
```env
# WhatsApp API
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_VERIFY_TOKEN=wabm_webhook_verify_token_2024
WHATSAPP_WEBHOOK_URL=https://your-ngrok-url.ngrok-free.app/api/webhook

# Note: Business numbers (numberId, wabaId, phoneNumber) are now stored in the BusinessNumber model in the database
# Add them via the admin interface at /admin/numbers
```

### **2. SSL Certificates (Production)**

For HTTPS in production, create SSL certificates:
```bash
# Create SSL directory
mkdir ssl

# Generate self-signed certificates (for testing)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

### **3. Start Development Environment**
```bash
# Build and start development containers
docker-compose -f docker-compose.dev.yml up --build

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop development environment
docker-compose -f docker-compose.dev.yml down
```

### **4. Start Production Environment**
```bash
# Build and start production containers
docker-compose up --build

# View logs
docker-compose logs -f

# Stop production environment
docker-compose down
```

## 🔍 **Docker Commands**

### **Development Commands**
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up --build

# Start in background
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f wabm

# Execute commands in container
docker-compose -f docker-compose.dev.yml exec wabm sh

# Run database migrations
docker-compose -f docker-compose.dev.yml exec wabm npx prisma migrate dev

# Open Prisma Studio
docker-compose -f docker-compose.dev.yml exec wabm npx prisma studio

# Stop development environment
docker-compose -f docker-compose.dev.yml down
```

### **Production Commands**
```bash
# Start production environment
docker-compose up --build

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f wabm

# Execute commands in container
docker-compose exec wabm sh

# Run database migrations
docker-compose exec wabm npx prisma migrate deploy

# Stop production environment
docker-compose down

# Remove all containers and volumes
docker-compose down -v
```

### **Database Commands**
```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U wabm_user -d wabm_db

# Backup database
docker-compose exec postgres pg_dump -U wabm_user wabm_db > backup.sql

# Restore database
docker-compose exec -T postgres psql -U wabm_user -d wabm_db < backup.sql

# View database logs
docker-compose logs postgres
```



## 📊 **Monitoring and Logs**

### **Application Logs**
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f wabm
docker-compose logs -f postgres
docker-compose logs -f nginx
```

### **Health Checks**
```bash
# Check application health
curl http://localhost:3000/api/health

# Check nginx health
curl http://localhost/health

# Check database connection
docker-compose exec wabm npx prisma db push
```

### **Resource Usage**
```bash
# View container resource usage
docker stats

# View disk usage
docker system df
```

## 🔒 **Security Considerations**

### **Environment Variables**
- ✅ **Never commit** `.env.local` to Git
- ✅ **Use secrets** in production
- ✅ **Rotate credentials** regularly

### **Network Security**
- ✅ **Internal network** for service communication
- ✅ **Exposed ports** only where necessary
- ✅ **SSL termination** at Nginx level

### **Data Protection**
- ✅ **Persistent volumes** for data storage
- ✅ **Regular backups** of PostgreSQL data
- ✅ **Encrypted connections** in production

## 🚀 **Deployment Options**

### **Local Development**
```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up --build
```

### **Production Server**
```bash
# Start production environment
docker-compose up -d --build
```

### **Cloud Deployment**
- **Railway**: Deploy with `railway up`
- **Heroku**: Use Heroku container registry
- **AWS ECS**: Deploy with ECS task definitions
- **Google Cloud Run**: Deploy with Cloud Run

## 🔧 **Troubleshooting**

### **Common Issues**

#### **1. Port Conflicts**
```bash
# Check what's using port 3000
lsof -i :3000

# Use different ports in docker-compose.yml
ports:
  - "3001:3000"
```

#### **2. Database Connection Issues**
```bash
# Check database logs
docker-compose logs postgres

# Test database connection
docker-compose exec wabm npx prisma db push

# Reset database
docker-compose down -v
docker-compose up --build
```

#### **3. Build Failures**
```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

#### **4. Permission Issues**
```bash
# Fix file permissions
sudo chown -R $USER:$USER .

# Fix Docker permissions
sudo usermod -aG docker $USER
```

### **Useful Commands**
```bash
# View running containers
docker ps

# View all containers (including stopped)
docker ps -a

# View container details
docker inspect wabm_app

# View container logs
docker logs wabm_app

# Execute command in running container
docker exec -it wabm_app sh

# Copy files from/to container
docker cp wabm_app:/app/logs ./logs
```

## 📈 **Performance Optimization**

### **Docker Optimizations**
- ✅ **Multi-stage builds** for smaller images
- ✅ **Layer caching** for faster builds
- ✅ **Alpine Linux** for minimal image size
- ✅ **Production-only dependencies**

### **Application Optimizations**
- ✅ **Connection pooling** for database
- ✅ **Redis caching** for sessions
- ✅ **Nginx compression** for static files
- ✅ **Rate limiting** for API protection

## 🎯 **Next Steps**

1. **Set up environment variables** in `.env.local`
2. **Choose deployment target** (local/cloud)
3. **Start development environment** for testing
4. **Deploy to production** when ready
5. **Monitor and maintain** the application

**Your WABM application is now fully containerized and ready for deployment!** 🚀🐳 