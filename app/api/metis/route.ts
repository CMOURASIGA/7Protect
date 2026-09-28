import { NextResponse } from "next/server";
import { validateMetisResult } from "@/application/metis-schema";
import { isSanitizedMetisContext, type SanitizedMetisContext } from "@/application/metis-sanitizer";
import type { MetisUsage } from "@/domains/core/entities";

export const runtime = "nodejs";

const instructions = `Você é Metis, Assistente de Planejamento para corretores de seguros. Use somente os dados recebidos. Diferencie fato informado de inferência, diga explicitamente quando faltarem informações e não invente regras, aceitação, preço ou produto de seguradora. Não trate capital segurado como investimento, rendimento ou retorno. Não recomende uma decisão definitiva. Preserve a revisão profissional obrigatória. Responda somente JSON com summary, attentionPoints, protectionTopics, questions, missingInformation, proposalReview opcional com alignedItems e reviewItems, e disclaimer.`;
class MetisRouteError extends Error { constructor(message: string, readonly status: number, readonly code: string, readonly retryable: boolean) { super(message); } }
const configuredTimeout = () => Math.min(30_000, Math.max(3_000, Number(process.env.OPENAI_METIS_TIMEOUT_MS ?? 12_000)));
const configuredAttempts = () => Math.min(3, Math.max(1, Number(process.env.OPENAI_METIS_MAX_ATTEMPTS ?? 2)));
const retryableStatus = (status: number) => status === 408 || status === 429 || status >= 500;
const pause = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const demoWindowMs = () => Math.min(86_400_000, Math.max(60_000, Number(process.env.DEMO_METIS_WINDOW_MS ?? 3_600_000)));
const demoMaxCalls = () => Math.min(20, Math.max(1, Number(process.env.DEMO_METIS_MAX_CALLS ?? 6)));
const demoCalls = new Map<string, number[]>();
function consumeDemoCall(request: Request) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true" || process.env.VERCEL_ENV === "production") return true;
  const session = request.headers.get("x-7protect-demo-session");
  if (!session || !/^[a-z0-9-]{16,}$/i.test(session)) return false;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const key = `${forwarded}:${session}`; const now = Date.now(); const entries = (demoCalls.get(key) ?? []).filter((at) => at > now - demoWindowMs());
  if (entries.length >= demoMaxCalls()) return false;
  entries.push(now); demoCalls.set(key, entries);
  return true;
}

async function requestOpenAi(key: string, model: string, context: SanitizedMetisContext) {
  const startedAt = Date.now();
  const attempts = configuredAttempts();
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), configuredTimeout());
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, response_format: { type: "json_object" }, messages: [{ role: "system", content: instructions }, { role: "user", content: JSON.stringify(context) }], temperature: 0.2 }), signal: controller.signal });
      const body = await response.json().catch(() => ({})) as { choices?: Array<{ message?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } };
      if (!response.ok) {
        if (retryableStatus(response.status) && attempt < attempts) { await pause(attempt * 250); continue; }
        throw new MetisRouteError("A Metis não está disponível no momento. Tente novamente.", 502, response.status === 429 ? "rate_limited" : "provider_unavailable", retryableStatus(response.status));
      }
      const content = body.choices?.[0]?.message?.content;
      if (!content) throw new MetisRouteError("A Metis retornou uma resposta sem conteúdo. Tente novamente.", 502, "empty_response", true);
      let parsed: unknown;
      try { parsed = JSON.parse(content); } catch { throw new MetisRouteError("A Metis retornou uma resposta inválida. Tente novamente.", 502, "invalid_json", true); }
      let result;
      try { result = validateMetisResult(parsed); } catch { throw new MetisRouteError("A Metis retornou um formato inválido. Tente novamente.", 502, "invalid_schema", true); }
      const usage: MetisUsage = { inputTokens: body.usage?.prompt_tokens, outputTokens: body.usage?.completion_tokens, totalTokens: body.usage?.total_tokens };
      return { result, durationMs: Date.now() - startedAt, usage };
    } catch (reason) {
      if (reason instanceof MetisRouteError) throw reason;
      const timedOut = reason instanceof Error && reason.name === "AbortError";
      if (attempt < attempts) { await pause(attempt * 250); continue; }
      throw new MetisRouteError(timedOut ? "A Metis excedeu o tempo de resposta. Tente novamente." : "Não foi possível alcançar a Metis. Tente novamente.", 502, timedOut ? "timeout" : "network_error", true);
    } finally { clearTimeout(timeout); }
  }
  throw new MetisRouteError("A Metis não está disponível no momento. Tente novamente.", 502, "provider_unavailable", true);
}

export async function POST(request: Request) {
  if (!consumeDemoCall(request)) return NextResponse.json({ error: "Limite de demonstração da Metis atingido. Reinicie a demonstração ou tente novamente posteriormente.", code: "demo_limit", retryable: false }, { status: 429 });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: "A Metis real não está configurada neste ambiente.", code: "not_configured", retryable: false }, { status: 503 });
  let context: SanitizedMetisContext;
  try { ({ context } = await request.json() as { context: SanitizedMetisContext }); } catch { return NextResponse.json({ error: "Solicitação inválida." }, { status: 400 }); }
  if (!isSanitizedMetisContext(context)) return NextResponse.json({ error: "O contexto enviado não atende à política de dados minimizados.", code: "invalid_context", retryable: false }, { status: 400 });
  const model = process.env.OPENAI_METIS_MODEL ?? "gpt-4.1-mini";
  try {
    const response = await requestOpenAi(key, model, context);
    return NextResponse.json({ ...response, model });
  } catch (reason) {
    if (reason instanceof MetisRouteError) return NextResponse.json({ error: reason.message, code: reason.code, retryable: reason.retryable }, { status: reason.status });
    return NextResponse.json({ error: "Falha ao chamar a Metis.", code: "unknown_error", retryable: true }, { status: 502 });
  }
}
