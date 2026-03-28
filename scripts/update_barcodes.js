const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const mapping = [
  { barcode: "8800339453438", sku: "BSR453438" },
  { barcode: "8800339453445", sku: "BSR453445" },
  { barcode: "8800339453452", sku: "BSR453452" },
  { barcode: "8800339453469", sku: "BSR453469" },
  { barcode: "8800339453476", sku: "BSR453476" },
  { barcode: "8800339453483", sku: "BSR453483" },
  { barcode: "8800339453490", sku: "BSR453490" },
  { barcode: "8800339453506", sku: "BSR453506" },
  { barcode: "8800339453513", sku: "BSR453513" },
  { barcode: "8800339453520", sku: "BSR453520" },
  { barcode: "8800339453537", sku: "BSR453537" },
  { barcode: "8800339453544", sku: "BSR453544" },
  { barcode: "8800339453551", sku: "BSR453551" },
  { barcode: "8800339453568", sku: "BSR453568" },
  { barcode: "8800339453575", sku: "BSR453575" },
  { barcode: "8800339453582", sku: "BSR453582" },
  { barcode: "8800339453599", sku: "BSR453599" },
  { barcode: "8800339453605", sku: "BSR453605" },
  { barcode: "8800339453612", sku: "BSR453612" },
  { barcode: "8800339453629", sku: "BSR453629" },
  { barcode: "8800339453636", sku: "BSR453636" },
  { barcode: "8800339453643", sku: "BSR453643" },
  { barcode: "8800339453650", sku: "BSR453650" },
  { barcode: "8800339453667", sku: "BSR453667" },
  { barcode: "8800339453674", sku: "BSR453674" },
  { barcode: "8800339453681", sku: "BSR453681" },
  { barcode: "8800339453698", sku: "BSR453698" },
  { barcode: "8800339453704", sku: "BSR453704" },
  { barcode: "8800339453711", sku: "BSR453711" },
  { barcode: "8800339453728", sku: "BSR453728" },
  { barcode: "8800339453735", sku: "BSR453735" },
  { barcode: "8800339453742", sku: "BSR453742" },
  { barcode: "8800339453759", sku: "BSR453759" },
  { barcode: "8800339453766", sku: "BSR453766" },
  { barcode: "8800339453773", sku: "BSR453773" },
  { barcode: "8800339453780", sku: "BSR453780" },
  { barcode: "8800339453797", sku: "BSR453797" },
  { barcode: "8800339453803", sku: "BSR453803" },
  { barcode: "8800339453810", sku: "BSR453810" },
  { barcode: "8800339453827", sku: "BSR453827" },
  { barcode: "8800339453834", sku: "BSR453834" },
  { barcode: "8800339453841", sku: "BSR453841" },
  { barcode: "8800339453858", sku: "BSR453858" },
  { barcode: "8800339453865", sku: "BSR453865" },
  { barcode: "8800339453872", sku: "BSR453872" },
  { barcode: "8800339453889", sku: "BSR453889" },
  { barcode: "8800339453896", sku: "BSR453896" },
  { barcode: "8800339453902", sku: "BSR453902" },
  { barcode: "8800339453919", sku: "BSR453919" },
  { barcode: "8800339453926", sku: "BSR453926" },
  { barcode: "8800339453933", sku: "BSR453933" },
  { barcode: "8800339453940", sku: "BSR453940" },
  { barcode: "8800339453957", sku: "BSR453957" },
  { barcode: "8800339453964", sku: "BSR453964" },
  { barcode: "8800339453971", sku: "BSR453971" },
  { barcode: "8800339453988", sku: "BSR453995" }, // Wait, the last one is 95 in user request
  { barcode: "8800339453995", sku: "BSR453995" },
  { barcode: "8800339454077", sku: "BSR454077" },
  { barcode: "8800339454084", sku: "BSR454084" },
  { barcode: "8800339454091", sku: "BSR454091" },
  { barcode: "8800339454107", sku: "BSR454107" },
  { barcode: "8800339454114", sku: "BSR454114" },
  { barcode: "8800339454121", sku: "BSR454121" },
  { barcode: "8800339454138", sku: "BSR454138" },
  { barcode: "8800339454145", sku: "BSR454145" },
  { barcode: "8800339454169", sku: "BSR454169" },
];

async function main() {
  let successCount = 0;
  let skippedSkus = [];
  let duplicateBarcodes = [];

  for (const item of mapping) {
    try {
      // Update all SKUs with this code (across all stores)
      const updateResult = await prisma.sku.updateMany({
        where: { code: item.sku },
        data: { barcode: item.barcode }
      });

      if (updateResult.count > 0) {
        successCount += updateResult.count;
        console.log(`Updated SKU: ${item.sku} with Barcode: ${item.barcode} (${updateResult.count} records)`);
      } else {
        skippedSkus.push(item.sku);
      }
    } catch (error) {
      if (error.code === 'P2002') {
         duplicateBarcodes.push(`${item.barcode} (Unique constraint violation)`);
      } else {
         console.error(`Error updating SKU ${item.sku}:`, error.message);
         skippedSkus.push(`${item.sku} (Error: ${error.message})`);
      }
    }
  }

  console.log('\n--- UPDATE SUMMARY ---');
  console.log(`Success updates count: ${successCount}`);
  console.log(`Skipped SKUs: ${skippedSkus.length > 0 ? skippedSkus.join(', ') : 'None'}`);
  console.log(`Duplicate barcode warnings: ${duplicateBarcodes.length > 0 ? duplicateBarcodes.join(', ') : 'None'}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
