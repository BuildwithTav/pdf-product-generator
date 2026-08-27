"use client";

import { useState } from "react";
import { CreditCard, Lock, Ticket } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";

export function PaywallCard({
  projectId,
  productName,
  onUnlocked,
}: {
  projectId: string;
  productName: string;
  onUnlocked: () => void;
}) {
  const [payLoading, setPayLoading] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    setPayLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/checkout`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout.");
      setPayLoading(false);
    }
  }

  async function redeem() {
    if (!code.trim()) return;
    setRedeeming(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/redeem-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUnlocked();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to redeem code.");
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-app-border bg-app-surface p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-app-accent-soft text-app-accent">
        <Lock className="h-5 w-5" />
      </div>
      <EyebrowLabel tone="accent">Ready to write</EyebrowLabel>
      <h2 className="mb-2 mt-2 font-display text-2xl font-medium text-app-ink">
        Generate <em className="italic text-app-accent">{productName}</em>
      </h2>
      <p className="mb-6 text-sm text-app-muted">
        $10 unlocks full writing, unlimited edits, and export for this product.
      </p>

      {error && (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <Button variant="primary" onClick={pay} disabled={payLoading} icon={<CreditCard className="h-4 w-4" />} className="w-full">
        {payLoading ? "Starting checkout…" : "Pay $10 to generate"}
      </Button>

      {!showCode ? (
        <button
          onClick={() => setShowCode(true)}
          className="mt-4 flex w-full items-center justify-center gap-1.5 text-sm text-app-muted transition hover:text-app-ink"
        >
          <Ticket className="h-3.5 w-3.5" /> Have an access code?
        </button>
      ) : (
        <div className="mt-4 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Access code"
            className="flex-1 rounded-full border border-app-border px-4 py-2 text-sm text-app-ink outline-none transition focus:border-app-accent"
          />
          <Button variant="secondary" onClick={redeem} disabled={redeeming || !code.trim()}>
            {redeeming ? "Checking…" : "Redeem"}
          </Button>
        </div>
      )}
    </div>
  );
}
