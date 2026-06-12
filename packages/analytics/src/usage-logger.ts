/**
 * Drop-in helper for logging API usage from your services.
 *
 * @example
 * await logUsage({
 *   apiUrl: process.env.USAGE_API_URL!,
 *   token: process.env.INTERNAL_API_TOKEN!,
 *   provider: "claude",
 *   model: "claude-sonnet-4-20250514",
 *   tokensInput: usage.input_tokens,
 *   tokensOutput: usage.output_tokens,
 *   cost: 0.012,
 *   projectName: "my-app",
 *   userEmail: "dev@company.com",
 * });
 */
export type LogUsageInput = {
  apiUrl: string;
  token?: string;
  provider: "cursor" | "claude" | "openai";
  model: string;
  tokensInput?: number;
  tokensOutput?: number;
  cost?: number;
  projectName?: string;
  userEmail?: string;
};

export async function logUsage(input: LogUsageInput) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (input.token) headers["x-internal-token"] = input.token;

  const res = await fetch(`${input.apiUrl.replace(/\/$/, "")}/api/usage/log`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      provider: input.provider,
      model: input.model,
      tokensInput: input.tokensInput ?? 0,
      tokensOutput: input.tokensOutput ?? 0,
      cost: input.cost ?? 0,
      projectName: input.projectName,
      userEmail: input.userEmail,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Usage log failed: ${res.status} ${text}`);
  }

  return res.json();
}
