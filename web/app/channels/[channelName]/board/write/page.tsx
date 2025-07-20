import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserProfile } from '@/lib/user';
import { hasPermission_Server } from '@/lib/auth/serverAuth';
import WriteForm from './WriteForm';
import prisma from '@/lib/prisma';

interface WritePostPageProps {
  params: {
    channelName: string;
  };
}

export default async function WritePostPage({ params }: { params: Promise<{ channelName: string }> }) {
  const { channelName } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const userProfile = await getUserProfile(user.id);

  if (!userProfile?.role?.id) {
    redirect(`/${channelName}/board?error=permission_denied`);
  }

  if (!await hasPermission_Server(userProfile.role.id, 'POST_CREATE')) {
    redirect(`/${channelName}/board?error=permission_denied`);
  }

  const board = await prisma.board.findFirst({
    where: {
      channel: {
        slug: channelName,
      },
    },
    select: {
      name: true,
    },
  });

  if (!board) {
    redirect('/?error=board_not_found');
  }

  return (
    <div className="min-h-screen bg-cyber-black-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">새 글 작성 - {board.name}</h1>
        <WriteForm channelName={channelName} boardName={board.name} />
      </div>
    </div>
  );
}
