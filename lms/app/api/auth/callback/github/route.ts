import { NextRequest } from 'next/server';
import { GET as handleGithubCallback } from '@/app/api/integrations/github/callback/route';

export async function GET(request: NextRequest) {
  return handleGithubCallback(request);
}
