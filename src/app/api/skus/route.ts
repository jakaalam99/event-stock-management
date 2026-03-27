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
    const { code, name, quantity, srp, lowStockThreshold, imageUrl } = body;

    const sku = await prisma.sku.upsert({
      where: { code },
      update: { name, quantity: { increment: quantity }, srp: srp || 0, lowStockThreshold, imageUrl },
      create: { code, name, quantity, srp: srp || 0, lowStockThreshold, imageUrl },
    });

    return NextResponse.json(sku);
  } catch (error) {
    console.error('Error creating/updating SKU:', error);
    return NextResponse.json({ error: 'Failed to save SKU' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, code, name, quantity, srp, lowStockThreshold, imageUrl } = body;

    if (!id && !code) {
      return NextResponse.json({ error: 'Missing identifier (id or code)' }, { status: 400 });
    }

    const sku = await prisma.sku.update({
      where: id ? { id } : { code },
      data: {
        name,
        code, // Allow updating code as well if needed
        quantity: quantity !== undefined ? quantity : undefined, // Allow direct set of quantity
        srp: srp !== undefined ? srp : undefined,
        lowStockThreshold,
        imageUrl
      },
    });

    return NextResponse.json(sku);
  } catch (error) {
    console.error('Error updating SKU:', error);
    return NextResponse.json({ error: 'Failed to update SKU' }, { status: 500 });
  }
}
