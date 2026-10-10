import { getSignageManifest } from '@/lib/signage';

export async function GET() {
  return new Response(JSON.stringify(await getSignageManifest()), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
}
