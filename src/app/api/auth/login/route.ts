import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, generateToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = generateToken({ 
      userId: user.id, 
      email: user.email, 
      role: user.role, 
      name: user.name 
    });

    // Set cookie for persistence
    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return NextResponse.json({ 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      } 
    });
  } catch (error: any) {
    console.error('Login error details:', error);
    // Be more specific about the error for debugging
    let errorMessage = 'An unexpected error occurred';
    if (error.message?.includes('P2021')) errorMessage = 'Database tables not found. Did you run the SQL script?';
    if (error.message?.includes('P1001')) errorMessage = 'Cannot reach database. Check your DATABASE_URL in .env';
    if (error.code === 'P2002') errorMessage = 'This email is already registered';
    
    return NextResponse.json({ error: errorMessage, details: error.message || JSON.stringify(error, Object.getOwnPropertyNames(error)) }, { status: 500 });
  }
}
