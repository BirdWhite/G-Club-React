import { createClient } from './server';

export async function getCurrentUser() {
  const supabase = await createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { redirect: { destination: '/login', permanent: false } };
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    return { redirect: { destination: '/login', permanent: false } };
  }
  return { props: { user } };
}
