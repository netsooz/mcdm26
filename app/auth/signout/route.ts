import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServerClient } from '../../../lib/supabase/server';
import { DEV_BYPASS_COOKIE } from '../../../lib/auth-config';

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();

  const response = NextResponse.redirect(new URL('/login', request.url), { status: 303 });
  response.cookies.delete(DEV_BYPASS_COOKIE);
  return response;
}

export const GET = POST;
