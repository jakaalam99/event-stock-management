import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

async function getSessionStoreId() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token) as any;
  return decoded?.storeId || null;
}

export async function POST(request: Request) {
  const storeId = await getSessionStoreId();
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

      const barcode = String(row.Barcode || row.barcode || '').trim() || null;

      if (!code || !name) continue;

      const result = await prisma.sku.upsert({
        where: { code_storeId: { code, storeId } },
        update: { name, quantity: { increment: quantity }, srp, lowStockThreshold: threshold, imageUrl: row.imageUrl || null, barcode },
        create: { code, name, quantity, srp, lowStockThreshold: threshold, imageUrl: row.imageUrl || null, storeId, barcode },
      });
      results.push(result);
    }

    return NextResponse.json({ message: `Successfully processed ${results.length} SKUs`, count: results.length });
  } catch (error: any) {
    console.error('Import failed:', error);
    return NextResponse.json({ error: error.message || 'Import failed' }, { status: 500 });
  }
}
