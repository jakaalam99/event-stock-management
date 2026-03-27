-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- Insert Default Store
INSERT INTO "Store" ("id", "name", "createdAt") VALUES ('default-main-store', 'Main Store', CURRENT_TIMESTAMP);

-- AlterTable
ALTER TABLE "Sku" ADD COLUMN "storeId" TEXT NOT NULL DEFAULT 'default-main-store';
ALTER TABLE "Transaction" ADD COLUMN "storeId" TEXT NOT NULL DEFAULT 'default-main-store';
ALTER TABLE "User" ADD COLUMN "storeId" TEXT NOT NULL DEFAULT 'default-main-store';

-- DropIndex
ALTER TABLE "Sku" DROP CONSTRAINT "Sku_code_key";

-- CreateIndex
CREATE UNIQUE INDEX "Sku_code_storeId_key" ON "Sku"("code", "storeId");

-- AddForeignKey
ALTER TABLE "Sku" ADD CONSTRAINT "Sku_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
