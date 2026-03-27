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

export async function GET() {
  const storeId = await getSessionStoreId();
  if (!storeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [
      totalSkus,
      lowStockCount,
      totalTransactions,
      totalStock,
      recentActivity,
      salesStats
    ] = await Promise.all([
      prisma.sku.count({ where: { storeId } }),
      prisma.sku.count({ where: { storeId, quantity: { lte: 10 } } }), // Simplified for compatibility
      prisma.transaction.count({ where: { storeId, status: 'COMPLETED' } }),
      prisma.sku.aggregate({
        where: { storeId },
        _sum: { quantity: true }
      }),
      prisma.transaction.findMany({
        where: { storeId, status: 'COMPLETED' },
        include: {
          user: { select: { name: true } },
          items: { include: { sku: { select: { name: true, srp: true, code: true } } } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      // Aggregate sales data
      prisma.transactionItem.findMany({
        where: { 
            transaction: { 
                storeId, 
                status: 'COMPLETED',
                type: 'SHOP_OUT' 
            } 
        },
        include: {
            sku: { select: { id: true, name: true, code: true, srp: true, quantity: true } }
        }
      })
    ]);

    // Calculate revenue and contributions
    let totalRevenue = 0;
    let totalItemsSold = 0;
    const contributionsMap: Record<string, any> = {};

    (salesStats as any[]).forEach(item => {
        const qty = item.quantity;
        const rev = qty * (item.sku?.srp || 0);
        totalRevenue += rev;
        totalItemsSold += qty;

        if (item.sku && !contributionsMap[item.skuId]) {
            contributionsMap[item.skuId] = {
                id: item.skuId,
                code: item.sku.code,
                name: item.sku.name,
                qtySold: 0,
                currentStock: item.sku.quantity,
                revenue: 0
            };
        }
        if (contributionsMap[item.skuId]) {
            contributionsMap[item.skuId].qtySold += qty;
            contributionsMap[item.skuId].revenue += rev;
        }
    });

    const skuContributions = Object.values(contributionsMap)
        .map((c: any) => ({
            ...c,
            percentage: totalRevenue > 0 ? (c.revenue / totalRevenue) * 100 : 0
        }))
        .sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({
        totalSkus,
        lowStockItems: lowStockCount,
        totalTransactions,
        totalRevenue,
        totalItemsSold,
        totalStock: totalStock._sum?.quantity || 0,
        skuContributions,
        recentActivity
    });

  } catch (error) {
    console.error('Dashboard Stats API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
