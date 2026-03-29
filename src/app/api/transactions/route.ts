import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

async function getSessionStoreId() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token) as any;
  return decoded?.storeId || null;
}

export async function GET() {
  const storeId = await getSessionStoreId();
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const transactions = await prisma.transaction.findMany({
      where: { storeId },
      include: {
        user: true, // Get user name/email
        items: {
          include: {
            sku: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const storeId = await getSessionStoreId();
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { items, userId, userName, notes } = body; // items: [{ skuId: string, quantity: number }]

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    const groupId = uuidv4();

    // Atomic Transaction with Concurrency Control
    const result = await prisma.$transaction(async (tx) => {
      // 1. Batch lock rows and check availability in one go
      const skuIds = items.map((item: any) => item.skuId);
      const skus = await tx.$queryRawUnsafe<any[]>(
        `SELECT id, quantity, name, "storeId" FROM "Sku" WHERE id = ANY($1) FOR UPDATE`,
        skuIds
      );

      // Validate all requested items
      for (const item of items) {
        const sku = skus.find(s => s.id === item.skuId);
        
        if (!sku || sku.storeId !== storeId) {
          throw new Error(`SKU with ID ${item.skuId} not found or unauthorized`);
        }

        if (sku.quantity < item.quantity) {
          throw new Error(`Insufficient stock for ${sku.name}. Available: ${sku.quantity}, Requested: ${item.quantity}`);
        }
      }

      // 2. Perform deductions
      for (const item of items) {
        await tx.sku.update({
          where: { id: item.skuId },
          data: {
            quantity: { decrement: item.quantity },
          },
        });
      }

      // 3. Create Transaction Record
      const transaction = await tx.transaction.create({
        data: {
          groupId,
          notes,
          userId,
          type: 'SHOP_OUT',
          status: 'COMPLETED',
          storeId,
          items: {
            create: items.map((item: any) => ({
              skuId: item.skuId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          items: true,
          user: true,
        },
      });

      return transaction;
    }, {
      timeout: 15000, // 15s to prevent "Transaction not found" on slower DB responses
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Shop-out transaction failed:', error);
    return NextResponse.json({ error: error.message || 'Transaction failed' }, { status: 400 });
  }
}
