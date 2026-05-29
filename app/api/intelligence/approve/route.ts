import type { NextRequest } from 'next/server';
import { verifySignature, decodeSource, addSourceToLiveKB } from '@/lib/intelligence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const encoded = searchParams.get('source');
  const sig = searchParams.get('sig');

  if (!encoded || !sig) {
    return new Response(errorPage('Missing parameters'), { status: 400, headers: { 'Content-Type': 'text/html' } });
  }

  if (!verifySignature(encoded, sig)) {
    return new Response(errorPage('Invalid or expired link'), { status: 403, headers: { 'Content-Type': 'text/html' } });
  }

  let source: { title: string; text: string };
  try {
    source = decodeSource(encoded);
  } catch {
    return new Response(errorPage('Could not decode source content'), { status: 400, headers: { 'Content-Type': 'text/html' } });
  }

  const success = await addSourceToLiveKB(source);

  if (!success) {
    return new Response(errorPage('Retell API returned an error — add manually in the Retell dashboard.'), { status: 502, headers: { 'Content-Type': 'text/html' } });
  }

  return new Response(successPage(source.title), { headers: { 'Content-Type': 'text/html' } });
}

function successPage(title: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Published — Lucy Intelligence</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;background:#f0fdf4;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}.card{background:#fff;border-radius:16px;padding:48px 40px;max-width:480px;width:100%;box-shadow:0 4px 24px rgba(0,0,0,.08);text-align:center}.icon{width:64px;height:64px;background:#dcfce7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;font-size:28px}h1{font-size:22px;color:#111;margin-bottom:12px}.title{font-size:14px;color:#15803d;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:12px 16px;margin:16px 0 24px;font-weight:500}p{font-size:14px;color:#6b7280;line-height:1.6}.note{margin-top:24px;padding-top:24px;border-top:1px solid #f3f4f6;font-size:12px;color:#9ca3af}</style>
  </head><body><div class="card"><div class="icon">✓</div><h1>Published to Lucy</h1><div class="title">${escapeHtml(title)}</div><p>This source is now live in <strong>Lucy — Live Intelligence</strong> and active on all future calls.</p><p class="note">Lucy — Stayful AI Intelligence System</p></div></body></html>`;
}

function errorPage(message: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Error — Lucy Intelligence</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;background:#fef2f2;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}.card{background:#fff;border-radius:16px;padding:48px 40px;max-width:480px;width:100%;box-shadow:0 4px 24px rgba(0,0,0,.08);text-align:center}.icon{width:64px;height:64px;background:#fee2e2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;font-size:28px}h1{font-size:22px;color:#111;margin-bottom:12px}p{font-size:14px;color:#6b7280;line-height:1.6}</style>
  </head><body><div class="card"><div class="icon">✕</div><h1>Could Not Publish</h1><p>${escapeHtml(message)}</p></div></body></html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
