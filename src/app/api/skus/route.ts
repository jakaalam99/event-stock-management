import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'name';
  const order = (searchParams.get('order') || 'asc') as 'asc' | 'desc';

  try {
    const skus = await prisma.sku.findMany({
      where: {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ],
      },
      orderBy: { [sort]: order },
    });
    return NextResponse.json(skus);
  } catch (error) {
    console.error('Error fetching SKUs:', error);
    return NextResponse.json({ error: 'Failed to fetch SKUs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, name, quantity, srp, lowStockThreshold } = body;

    const sku = await prisma.sku.upsert({
      where: { code },
      update: { name, quantity: { increment: quantity }, srp: srp || 0, lowStockThreshold },
      create: { code, name, quantity, srp: srp || 0, lowStockThreshold },
    });

    return NextResponse.json(sku);
  } catch (error) {
    console.error('Error creating/updating SKU:', error);
    return NextResponse.json({ error: 'Failed to save SKU' }, { status: 500 });
  }
}
