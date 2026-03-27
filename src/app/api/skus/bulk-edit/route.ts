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

    let updatedCount = 0;
    let errorCount = 0;

    // Reconciliation Loop: Absolute Set
    for (const row of data) {
      const code = String(row.SKU || row.code || '').trim();
      const quantity = parseInt(String(row.Quantity || row.quantity || '0'));
      
      // We only update SRP or Name if they are present in the row, 
      // but we EXPLICITLY do NOT touch imageUrl to prevent deletion.
      const name = row.Name || row.name;
      const srp = row.SRP || row.srp ? parseFloat(row.SRP || row.srp) : undefined;

      if (!code) continue;

      try {
        await prisma.sku.update({
          where: { 
            code_storeId: { code, storeId } 
          },
          data: {
            quantity: quantity, // ABSOLUTE SET
            name: name || undefined,
            srp: srp !== undefined ? srp : undefined,
            // imageUrl is NOT included here to preserve it.
          },
        });
        updatedCount++;
      } catch (err) {
        console.error(`Bulk edit failed for SKU ${code}:`, err);
        errorCount++;
      }
    }

    return NextResponse.json({ 
      message: `Reconciliation complete. ${updatedCount} SKUs updated. ${errorCount} errors.`, 
      updated: updatedCount,
      errors: errorCount
    });
  } catch (error: any) {
    console.error('Bulk edit failed:', error);
    return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 500 });
  }
}
