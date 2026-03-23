# 🗄️ WABM Database Setup Guide

## 📋 **Overview**

WABM now uses **PostgreSQL** with **Prisma ORM** for persistent storage. This provides:

- ✅ **Reliable data persistence** across server restarts
- ✅ **ACID compliance** for data integrity
- ✅ **Complex queries** for message history and analytics
- ✅ **Scalability** for growing businesses
- ✅ **Type safety** with Prisma's TypeScript integration

## 🚀 **Quick Setup Options**

### **Option 1: Railway (Recommended - Free)**
1. **Visit**: [railway.app](https://railway.app)
2. **Sign up** with GitHub
3. **Create new project** → "Deploy from GitHub repo"
4. **Add PostgreSQL** service
5. **Copy DATABASE_URL** to your `.env.local`

### **Option 2: Supabase (Free Tier)**
1. **Visit**: [supabase.com](https://supabase.com)
2. **Create new project**
3. **Go to Settings** → Database
4. **Copy connection string** to your `.env.local`

### **Option 3: Neon (Free Tier)**
1. **Visit**: [neon.tech](https://neon.tech)
2. **Create new project**
3. **Copy connection string** to your `.env.local`

### **Option 4: Local PostgreSQL**
1. **Install PostgreSQL** on your machine
2. **Create database**: `createdb wabm_db`
3. **Set DATABASE_URL** in `.env.local`

## 🔧 **Setup Steps**

### **1. Environment Configuration**

Add to your `.env.local`:
```env
DATABASE_URL="postgresql://username:password@host:port/database"
```

### **2. Generate Prisma Client**
```bash
npx prisma generate
```

### **3. Run Database Migrations**
```bash
npx prisma migrate dev --name init
```

### **4. Verify Setup**
```bash
npx prisma studio
```

## 📊 **Database Schema**

### **Messages Table**
```sql
- id: String (Primary Key)
- from: String (Phone number)
- to: String (Phone number)
- text: String (Message content)
- timestamp: DateTime
- type: MessageType (SENT/RECEIVED)
- status: MessageStatus (SENDING/SENT/DELIVERED/READ/FAILED)
- contactName: String? (Optional contact name)
- whatsappMessageId: String? (WhatsApp's message ID)
- conversationId: String? (WhatsApp conversation ID)
- createdAt: DateTime
- updatedAt: DateTime
```

### **Customer Service Windows Table**
```sql
- id: String (Primary Key)
- phoneNumber: String (Unique customer number)
- isOpen: Boolean
- openedAt: DateTime
- expiresAt: DateTime
- lastUserMessageAt: DateTime?
- messageCount: Int
- createdAt: DateTime
- updatedAt: DateTime
```

### **Contacts Table**
```sql
- id: String (Primary Key)
- phoneNumber: String (Unique)
- name: String?
- email: String?
- company: String?
- whatsappId: String? (WhatsApp's wa_id)
- createdAt: DateTime
- updatedAt: DateTime
```

### **Templates Table**
```sql
- id: String (Primary Key)
- name: String
- language: String
- category: String
- status: TemplateStatus (DRAFT/PENDING/APPROVED/REJECTED)
- components: Json? (Template components)
- whatsappTemplateId: String?
- createdAt: DateTime
- updatedAt: DateTime
```

### **Business Numbers Table**
```sql
- id: String (Primary Key)
- numberId: String (Unique WhatsApp phone number ID)
- phoneNumber: String (Unique actual phone number)
- wabaId: String (WhatsApp Business Account ID)
- label: String (Display name)
- isActive: Boolean
- createdAt: DateTime
- updatedAt: DateTime
```

### **Webhook Logs Table**
```sql
- id: String (Primary Key)
- eventType: String (message/status/verification)
- payload: Json (Full webhook payload)
- processed: Boolean
- error: String?
- createdAt: DateTime
```

## 🔄 **Migration from In-Memory Storage**

The application now uses database services instead of in-memory storage:

### **Before (In-Memory)**
```typescript
import { messageStore } from '../lib/messageStore';
messageStore.addMessage(message);
```

### **After (Database)**
```typescript
import { messageDB } from '../lib/database';
await messageDB.addMessage(message);
```

## 🛠️ **Database Operations**

### **Message Operations**
```typescript
// Add message
await messageDB.addMessage({
  from: '+1234567890',
  to: '+0987654321',
  text: 'Hello!',
  type: 'SENT',
  status: 'SENDING'
});

// Update status
await messageDB.updateMessageStatus(messageId, 'DELIVERED');

// Get messages by phone
const messages = await messageDB.getMessagesByPhoneNumber('+1234567890');
```

### **Customer Service Window Operations**
```typescript
// Open window
await customerServiceWindowDB.openWindow('+1234567890');

// Get status
const status = await customerServiceWindowDB.getWindowStatus('+1234567890');

// Cleanup expired
await customerServiceWindowDB.cleanupExpiredWindows();
```

### **Contact Operations**
```typescript
// Upsert contact
await contactDB.upsertContact('+1234567890', 'John Doe', 'john@example.com');

// Get contact
const contact = await contactDB.getContact('+1234567890');

// Search contacts
const results = await contactDB.searchContacts('John');
```

## 📈 **Performance Optimizations**

### **Indexes**
The schema includes optimized indexes for:
- ✅ **Phone number lookups** (from/to fields)
- ✅ **Timestamp sorting** (message history)
- ✅ **Status filtering** (message status)
- ✅ **Window expiration** (customer service windows)

### **Query Optimization**
- ✅ **Pagination** for large message histories
- ✅ **Selective field loading** for performance
- ✅ **Batch operations** for bulk updates
- ✅ **Connection pooling** for high concurrency

## 🔒 **Security Considerations**

### **Environment Variables**
- ✅ **DATABASE_URL** stored securely in `.env.local`
- ✅ **Never commit** database credentials to Git
- ✅ **Use connection pooling** in production

### **Data Protection**
- ✅ **Phone numbers** stored as strings
- ✅ **Message content** encrypted in transit
- ✅ **Contact information** protected
- ✅ **GDPR compliance** ready

## 🚀 **Deployment Considerations**

### **Production Database**
- ✅ **Use managed PostgreSQL** (Railway, Supabase, Neon)
- ✅ **Enable connection pooling**
- ✅ **Set up automated backups**
- ✅ **Monitor database performance**

### **Environment Variables**
```env
# Production
DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"

# Development
DATABASE_URL="postgresql://user:pass@localhost:5432/wabm_db"
```

## 🔍 **Troubleshooting**

### **Common Issues**

#### **1. Connection Failed**
```bash
# Check DATABASE_URL format
echo $DATABASE_URL

# Test connection
npx prisma db pull
```

#### **2. Migration Errors**
```bash
# Reset database
npx prisma migrate reset

# Generate fresh migration
npx prisma migrate dev --name fresh_start
```

#### **3. Prisma Client Issues**
```bash
# Regenerate client
npx prisma generate

# Restart development server
npm run dev
```

### **Useful Commands**
```bash
# Open Prisma Studio (Database GUI)
npx prisma studio

# View database schema
npx prisma db pull

# Generate migration
npx prisma migrate dev --name migration_name

# Deploy migrations to production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

## 🎯 **Next Steps**

1. **Choose a database provider** (Railway recommended)
2. **Set up DATABASE_URL** in `.env.local`
3. **Run migrations** to create tables
4. **Test the application** with persistent storage
5. **Deploy to production** with database

**Your WABM application now has enterprise-grade persistent storage!** 🚀 