import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const transactions = await prisma.transaction.findMany({
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
  try {
    const body = await request.json();
    const { items, userId, userName } = body; // items: [{ skuId: string, quantity: number }]

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    const groupId = uuidv4();

    // Atomic Transaction with Concurrency Control
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock rows and check availability
      for (const item of items) {
        // Use raw SQL for row-level locking (SELECT ... FOR UPDATE)
        const [sku] = await tx.$queryRawUnsafe<any[]>(
          `SELECT id, quantity, name FROM "Sku" WHERE id = $1 FOR UPDATE`,
          item.skuId
        );

        if (!sku) {
          throw new Error(`SKU with ID ${item.skuId} not found`);
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
          userId, // Foreign Key to User
          type: 'SHOP_OUT',
          status: 'COMPLETED',
          items: {
            create: items.map((item: any) => ({
              skuId: item.skuId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          items: true,
          user: true, // Include user data for the response
        },
      });

      return transaction;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Shop-out transaction failed:', error);
    return NextResponse.json({ error: error.message || 'Transaction failed' }, { status: 400 });
  }
}
