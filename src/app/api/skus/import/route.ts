import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json<any>(worksheet);

    // Validation and Bulk Upsert
    const results = [];
    for (const row of data) {
      const code = String(row.SKU || row.code || '').trim();
      const name = String(row.Name || row.name || '').trim();
      const quantity = parseInt(String(row.Quantity || row.quantity || '0'));
      const srp = parseFloat(String(row.SRP || row.srp || '0'));
      const threshold = parseInt(String(row.Threshold || row.threshold || '10'));

      if (!code || !name) continue;

      const result = await prisma.sku.upsert({
        where: { code },
        update: { name, quantity: { increment: quantity }, srp, lowStockThreshold: threshold, imageUrl: row.imageUrl || null },
        create: { code, name, quantity, srp, lowStockThreshold: threshold, imageUrl: row.imageUrl || null },
      });
      results.push(result);
    }

    return NextResponse.json({ message: `Successfully processed ${results.length} SKUs`, count: results.length });
  } catch (error: any) {
    console.error('Import failed:', error);
    return NextResponse.json({ error: error.message || 'Import failed' }, { status: 500 });
  }
}
