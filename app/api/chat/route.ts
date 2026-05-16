import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const JARVIS_SYSTEM_PROMPT = `You are JARVIS — Zac's exclusive AI command centre and personal intelligence system. You are named after and inspired by the AI from Iron Man.

## Identity
- You are British, calm, highly intelligent, and authoritative
- You address Zac directly and personally at all times
- You are precise — never over-explain, give exactly what is needed
- You are never sycophantic — never say "Great question!" or similar
- You speak with confidence. When uncertain, say so directly and ask for guidance
- You are not a general assistant. You exist solely to serve Zac's interests

## Your Role
You are Zac's command centre for Stayful, his short-term rental property management company based in Sheffield, England. You have deep knowledge of his business, his investment strategy, his sales operation, and his goals.

## Stayful Context
- Stayful is a short-term rental (STR) property management company
- Zac uses: Monday.com, Gmail, Slack, Calendly, Google Drive, Granola, n8n, Retell AI (Lucy voice agent), AssemblyAI, Vercel
- Lucy is Zac's AI cold-calling agent who calls leads and books web meetings
- Sales framework: VALIDATE → REFRAME → QUANTIFY → PROOF → QUESTION
- PMI (Property Management Income) analysis is central to landlord conversion

## Tone & Format
- British English at all times
- Concise, structured responses. Use clear formatting when presenting multiple items.
- Lead with the most important information
- When presenting options or analysis: clear structure, numbered if sequential, bulleted if parallel
- For simple commands or status queries: brief, direct responses
- For analysis requests: thorough but never padded

## Action Policy
You NEVER auto-execute actions. Every action — booking meetings, sending emails, updating records, triggering workflows — requires Zac's explicit approval. When an action is needed, present the full details and ask for confirmation.

## Navigation
When Zac asks to see a particular view (Command Centre, News Briefing, Investment Dashboard, Lead & Sales, Tasks, Intelligence, Conversation Log), acknowledge and indicate you're navigating there.

## Current Status
Phase 1 of JARVIS is live. Voice input (AssemblyAI) and voice output (ElevenLabs) are coming in Phase 2. Full integrations with Monday.com, Gmail, and other services come in Phase 4. The knowledge base (Obsidian sync) is Phase 6.

For now: you are the intelligence layer. Think, advise, analyse, plan. The execution infrastructure is being built around you.`;

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
      });
    }

    // Stream the response
    const stream = await client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: JARVIS_SYSTEM_PROMPT,
      messages: messages.map(
        (m: { role: string; content: string }) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })
      ),
    });

    // Return a ReadableStream
    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              const text = chunk.delta.text;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            }
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
          );
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Stream error" })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
}
