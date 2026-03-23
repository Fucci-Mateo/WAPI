-- WABM Database Initialization Script
-- This script runs when the PostgreSQL container starts for the first time

-- Create the database if it doesn't exist
-- (This is handled by POSTGRES_DB environment variable)

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'UTC';

-- Create indexes for better performance
-- (These will be created by Prisma migrations, but we can add custom ones here)

-- Grant necessary permissions
-- Note: Database name will be set by POSTGRES_DB environment variable

-- Create a function to clean up old webhook logs (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM "WebhookLog" 
    WHERE "createdAt" < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create a function to clean up expired customer service windows
CREATE OR REPLACE FUNCTION cleanup_expired_windows()
RETURNS void AS $$
BEGIN
    UPDATE "CustomerServiceWindow" 
    SET "isOpen" = false 
    WHERE "expiresAt" < NOW();
END;
$$ LANGUAGE plpgsql;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'WABM database initialized successfully';
END $$; 