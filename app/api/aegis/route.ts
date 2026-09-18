import { NextResponse } from "next/server";
import { validateAegisResult } from "@/application/aegis-schema";
import type { SanitizedAegisContext } from "@/application/aegis-sanitizer";

export const runtime = "nodejs";

const instructions = `Você é Aegis, assistente de apoio a corretores de seguros. Use apenas os dados recebidos. Separe fatos de inferências, indique ausência de informações e não invente regras, aceitação, preço ou produto de seguradora. Não trate capital segurado como rendimento. Não recomende uma decisão definitiva. Responda somente JSON com summary, attentionPoints, protectionTopics, questions, missingInformation, proposalReview opcional com alignedItems e reviewItems, e disclaimer.`;

export async function POST(request: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: "A Aegis real não está configurada neste ambiente. Use o provider de homologação." }, { status: 503 });
  let context: SanitizedAegisContext;
  try { ({ context } = await request.json() as { context: SanitizedAegisContext }); } catch { return NextResponse.json({ error: "Solicitação inválida." }, { status: 400 }); }
  if (!context || typeof context !== "object") return NextResponse.json({ error: "Contexto sanitizado ausente." }, { status: 400 });
  const model = process.env.OPENAI_AEGIS_MODEL ?? "gpt-4.1-mini";
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, response_format: { type: "json_object" }, messages: [{ role: "system", content: instructions }, { role: "user", content: JSON.stringify(context) }], temperature: 0.2 }) });
    const body = await response.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
    if (!response.ok) return NextResponse.json({ error: body.error?.message ?? "Falha na OpenAI." }, { status: 502 });
    const content = body.choices?.[0]?.message?.content;
    if (!content) return NextResponse.json({ error: "A OpenAI não retornou conteúdo." }, { status: 502 });
    const result = validateAegisResult(JSON.parse(content));
    return NextResponse.json({ result, model });
  } catch (reason) {
    return NextResponse.json({ error: reason instanceof Error ? reason.message : "Falha ao chamar a OpenAI." }, { status: 502 });
  }
}
