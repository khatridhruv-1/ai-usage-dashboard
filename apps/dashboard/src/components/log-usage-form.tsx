"use client";

import { useState } from "react";
import { ChevronDown, PenLine } from "lucide-react";

import { clientApiPath } from "@/lib/env";

const PROVIDERS = [
  { value: "cursor", label: "Cursor" },
  { value: "claude", label: "Claude" },
  { value: "openai", label: "OpenAI" },
] as const;

type Provider = (typeof PROVIDERS)[number]["value"];

const DEFAULT_MODELS: Record<Provider, string> = {
  cursor: "auto",
  claude: "claude-sonnet-4",
  openai: "gpt-4o",
};

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-foreground)] outline-none transition focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30";

export function LogUsageForm() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [provider, setProvider] = useState<Provider>("cursor");
  const [model, setModel] = useState(DEFAULT_MODELS.cursor);
  const [tokensInput, setTokensInput] = useState("");
  const [tokensOutput, setTokensOutput] = useState("");
  const [cost, setCost] = useState("");
  const [projectName, setProjectName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const handleProviderChange = (next: Provider) => {
    setProvider(next);
    setModel(DEFAULT_MODELS[next]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const token = process.env.NEXT_PUBLIC_INTERNAL_API_TOKEN;
    if (!token) {
      setError("Set NEXT_PUBLIC_INTERNAL_API_TOKEN in apps/dashboard/.env (same as INTERNAL_API_TOKEN).");
      setSubmitting(false);
      return;
    }

    const body: Record<string, string | number> = {
      provider,
      model: model.trim() || DEFAULT_MODELS[provider],
      tokensInput: Number(tokensInput) || 0,
      tokensOutput: Number(tokensOutput) || 0,
      cost: Number(cost) || 0,
    };
    if (projectName.trim()) body.projectName = projectName.trim();
    if (userEmail.trim()) body.userEmail = userEmail.trim();

    try {
      const res = await fetch(clientApiPath("/api/usage/log"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-token": token,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to log usage");

      setSuccess("Usage logged. Refreshing…");
      setTokensInput("");
      setTokensOutput("");
      setCost("");
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log usage");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/5"
      >
        <div className="flex items-center gap-3">
          <PenLine className="h-4 w-4 text-violet-400" />
          <div>
            <p className="text-sm font-medium">Log usage manually</p>
            <p className="text-xs text-[var(--color-muted)]">
              Add usage from Cursor, Claude, or OpenAI when API sync isn&apos;t available
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[var(--color-muted)] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="border-t border-white/10 px-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-[var(--color-muted)]">Provider</span>
              <select
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value as Provider)}
                className={inputClass}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value} className="bg-[#111827]">
                    {p.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-[var(--color-muted)]">Model</span>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. claude-sonnet-4"
                className={inputClass}
                required
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-[var(--color-muted)]">Cost (USD)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0.50"
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-[var(--color-muted)]">Input tokens</span>
              <input
                type="number"
                min="0"
                step="1"
                value={tokensInput}
                onChange={(e) => setTokensInput(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-[var(--color-muted)]">Output tokens</span>
              <input
                type="number"
                min="0"
                step="1"
                value={tokensOutput}
                onChange={(e) => setTokensOutput(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-[var(--color-muted)]">Your email</span>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="you@company.com"
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm sm:col-span-2 lg:col-span-3">
              <span className="text-[var(--color-muted)]">Project (optional)</span>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="my-app"
                className={inputClass}
              />
            </label>
          </div>

          <p className="mt-3 text-xs text-[var(--color-muted)]">
            Copy numbers from your Cursor Usage page. Cost alone is enough if you don&apos;t have token counts.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Log usage"}
            </button>
            {error && <span className="text-xs text-red-400">{error}</span>}
            {success && <span className="text-xs text-emerald-400">{success}</span>}
          </div>
        </form>
      )}
    </div>
  );
}
