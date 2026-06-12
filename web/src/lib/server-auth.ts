import { auth } from './auth/server';

export async function getSessionUser() {
  const { data } = await auth.getSession();
  return data?.user ?? null;
}
