import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { isAdmin_Server, hasPermission_Server } from '@/lib/auth/serverAuth';
import { type Role } from '@prisma/client';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      include: { role: true },
    });

    if (!userProfile || !userProfile.role) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // 관리자 권한 확인
    if (!isAdmin_Server(userProfile.role)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const permissions = await prisma.permission.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ permissions });
  } catch (error: any) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
      include: { role: true },
    });

    if (!userProfile || !userProfile.role) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { roleId, permissionName, hasPermission } = body;

    const hasManagePermission = await hasPermission_Server(userProfile.role.id, 'MANAGE_ROLES');
    if (!hasManagePermission) {
      return NextResponse.json({ error: 'Not authorized to manage roles' }, { status: 403 });
    }

    if (hasPermission) {
      await prisma.role.update({
        where: { id: roleId },
        data: {
          permissions: {
            connect: { name: permissionName },
          },
        },
      });
    } else {
      await prisma.role.update({
        where: { id: roleId },
        data: {
          permissions: {
            disconnect: { name: permissionName },
          },
        },
      });
    }

    return NextResponse.json({ message: 'Permission updated successfully' });
  } catch (error: any) {
    console.error('Error updating permission:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
