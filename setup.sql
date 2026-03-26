-- SQL Setup for Event Stock Management
-- Run this in the Supabase SQL Editor to manually initialize the schema.

-- Force cleanup of existing schema to ensure a fresh start
DROP TABLE IF EXISTS "TransactionItem" CASCADE;
DROP TABLE IF EXISTS "Transaction" CASCADE;
DROP TABLE IF EXISTS "Sku" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- Clear existing types
DROP TYPE IF EXISTS "TransactionType" CASCADE;
DROP TYPE IF EXISTS "TransactionStatus" CASCADE;
DROP TYPE IF EXISTS "UserRole" CASCADE;

-- Enums
CREATE TYPE "TransactionType" AS ENUM ('SHOP_OUT', 'REVERSAL');
CREATE TYPE "TransactionStatus" AS ENUM ('COMPLETED', 'CANCELLED');
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

-- Tables
CREATE TABLE "User" (
    "id" TEXT PRIMARY KEY,
    "email" TEXT UNIQUE NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Sku" (
    "id" TEXT PRIMARY KEY,
    "code" TEXT UNIQUE NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "srp" DECIMAL(10,2) DEFAULT 0.00,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Transaction" (
    "id" TEXT PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL REFERENCES "User"("id"),
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "TransactionItem" (
    "id" TEXT PRIMARY KEY,
    "transactionId" TEXT NOT NULL REFERENCES "Transaction"("id") ON DELETE CASCADE,
    "skuId" TEXT NOT NULL REFERENCES "Sku"("id"),
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Initial Data Seed (Password for both: password123)
-- IMPORTANT: Passwords MUST be hashed with bcrypt. 
-- Do not insert plain text passwords into the "User" table.
INSERT INTO "User" ("id", "email", "password", "name", "role")
VALUES 
('user_admin', 'admin@eventstock.com', '$2b$10$tQ88mxzM68uznWs0sOrYTuGvaIbVCxiIczPpPs8hSgYLi1a8Jnwrm', 'Administrator', 'ADMIN'),
('user_staff', 'staff@eventstock.com', '$2b$10$tQ88mxzM68uznWs0sOrYTuGvaIbVCxiIczPpPs8hSgYLi1a8Jnwrm', 'Inventory Staff', 'USER')
ON CONFLICT ("email") DO UPDATE SET "password" = EXCLUDED."password";

-- To add your own custom user, use the Supabase SQL Editor:
-- INSERT INTO "User" ("id", "email", "password", "name", "role")
-- VALUES ('unique_id', 'your@email.com', 'bcrypt_hash_here', 'Your Name', 'ADMIN');
