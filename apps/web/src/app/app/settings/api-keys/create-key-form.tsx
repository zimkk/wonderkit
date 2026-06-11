"use client";

import { useState, useTransition } from "react";
import { createApiKey } from "@/lib/api-keys";

export function CreateKeyForm({ orgId }: { orgId: string }) {
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setNewKey(null);
    startTransition(async () => {
      try {
        const key = await createApiKey(orgId, name.trim());
        setNewKey(key);
        setName("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create key");
      }
    });
  }

  function handleCopy() {
    if (!newKey) return;
    navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-medium">Create a new key</h2>

      <form onSubmit={handleSubmit} className="flex gap-3 flex-wrap">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Production server"
          required
          className="flex-1 min-w-48 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create key"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {newKey && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
          <p className="text-sm font-medium text-green-800">
            Copy your key now — it will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-white border px-3 py-2 text-xs font-mono break-all text-gray-800">
              {newKey}
            </code>
            <button
              onClick={handleCopy}
              className="shrink-0 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-gray-50"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
