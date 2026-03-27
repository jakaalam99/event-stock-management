import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

async function getSessionStoreId() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token) as any;
  return decoded?.storeId || null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const storeId = await getSessionStoreId();
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { groupId } = await params;
    const body = await request.json();
    const { userId, userName } = body;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Find the original transaction items - strictly scoped by store
      const originalTransactions = await tx.transaction.findMany({
        where: { groupId, storeId, type: 'SHOP_OUT', status: 'COMPLETED' },
        include: { items: true },
      });

      if (originalTransactions.length === 0) {
        throw new Error('Transaction group not found or already cancelled');
      }

      // 2. Restore stock for each item
      for (const transaction of originalTransactions) {
        for (const item of transaction.items) {
          await tx.sku.update({
            where: { id: item.skuId },
            data: {
              quantity: { increment: item.quantity },
            },
          });
        }
        
        // 3. Mark as cancelled
        await tx.transaction.update({
          where: { id: transaction.id },
          data: { status: 'CANCELLED' },
        });
      }

      // 4. Create a reversal record for audit - with storeId
      const reversalRecord = await tx.transaction.create({
        data: {
          groupId,
          userId, // Foreign Key
          type: 'REVERSAL',
          status: 'COMPLETED',
          storeId,
        },
      });

      return reversalRecord;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Reversal failed:', error);
    return NextResponse.json({ error: error.message || 'Reversal failed' }, { status: 400 });
  }
}
