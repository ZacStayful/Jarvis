import type { NextRequest } from 'next/server';
import { verifySignature } from '@/lib/intelligence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const encoded = searchParams.get('title');
  const sig = searchParams.get('sig');

  if (!encoded || !sig || !verifySignature(encoded, sig)) {
    return new Response(page('Invalid link', false), { status: 400, headers: { 'Content-Type': 'text/html' } });
  }

  const title = Buffer.from(encoded, 'base64url').toString('utf-8');
  console.log(`[Intelligence] Rejected: ${title}`);
  return new Response(page(title, true), { headers: { 'Content-Type': 'text/html' } });
}

function page(title: string, success: boolean): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${success ? 'Rejected' : 'Error'} — Lucy Intelligence</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,sans-serif;background:#fafafa;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}.card{background:#fff;border-radius:16px;padding:48px 40px;max-width:480px;width:100%;box-shadow:0 4px 24px rgba(0,0,0,.08);text-align:center}.icon{width:64px;height:64px;background:#f3f4f6;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;font-size:28px}h1{font-size:22px;color:#111;margin-bottom:12px}.title{font-size:14px;color:#374151;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin:16px 0 24px;font-weight:500}p{font-size:14px;color:#6b7280;line-height:1.6}.note{margin-top:24px;padding-top:24px;border-top:1px solid #f3f4f6;font-size:12px;color:#9ca3af}</style>
  </head><body><div class="card"><div class="icon">✕</div><h1>${success ? 'Source Rejected' : 'Invalid Link'}</h1>${success ? `<div class="title">${escapeHtml(title)}</div>` : ''}<p>${success ? 'This source will not be added to Lucy. The system will continue monitoring for this pattern.' : 'This link is invalid or has expired.'}</p><p class="note">Lucy — Stayful AI Intelligence System</p></div></body></html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
