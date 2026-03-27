import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'name';
  const order = (searchParams.get('order') || 'asc') as 'asc' | 'desc';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const skip = (page - 1) * limit;

  try {
    const where = {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { code: { contains: search, mode: 'insensitive' as const } },
      ],
    };

    const [skus, total] = await Promise.all([
      prisma.sku.findMany({
        where,
        orderBy: { [sort]: order },
        skip,
        take: limit,
      }),
      prisma.sku.count({ where }),
    ]);

    return NextResponse.json({
      data: skus,
      total,
      page,
      limit,
    });
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
