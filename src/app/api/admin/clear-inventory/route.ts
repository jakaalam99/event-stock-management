import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token) as any;
    if (!decoded || decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Full Reset: Transactions items first, then Transactions, then SKUs in current store
    await prisma.$transaction([
      prisma.transactionItem.deleteMany({ where: { transaction: { storeId: decoded.storeId } } }),
      prisma.transaction.deleteMany({ where: { storeId: decoded.storeId } }),
      prisma.sku.deleteMany({ where: { storeId: decoded.storeId } }),
    ]);

    return NextResponse.json({ message: 'Inventory and history cleared successfully' });
  } catch (error: any) {
    console.error('Admin Clear Error:', error);
    return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 500 });
  }
}
