"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/TopNav";

export default function NewProjectPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    productName: "",
    niche: "",
    audience: "",
    corePromise: "",
    toneReference: "",
    chapterCountRequested: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productName: form.productName,
        niche: form.niche,
        audience: form.audience,
        corePromise: form.corePromise,
        toneReference: form.toneReference || undefined,
        chapterCountRequested: form.chapterCountRequested
          ? Number(form.chapterCountRequested)
          : undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setSubmitting(false);
      return;
    }

    router.push(`/project/${data.project.id}`);
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <TopNav />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="mb-1 text-2xl font-semibold text-neutral-900">New product</h1>
        <p className="mb-8 text-sm text-neutral-500">
          Tell us about the digital product you want to create. Claude will propose a full
          outline you can review before anything is written.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Product name" required>
            <input
              required
              value={form.productName}
              onChange={(e) => update("productName", e.target.value)}
              placeholder="e.g. The 30-Day Content Batching Playbook"
              className="input"
            />
          </Field>

          <Field label="Niche" required>
            <input
              required
              value={form.niche}
              onChange={(e) => update("niche", e.target.value)}
              placeholder="e.g. Social media growth for coaches"
              className="input"
            />
          </Field>

          <Field label="Target buyer / audience" required>
            <input
              required
              value={form.audience}
              onChange={(e) => update("audience", e.target.value)}
              placeholder="e.g. Solo coaches with under 5k followers who feel invisible online"
              className="input"
            />
          </Field>

          <Field label="Core promise / outcome" required>
            <textarea
              required
              rows={3}
              value={form.corePromise}
              onChange={(e) => update("corePromise", e.target.value)}
              placeholder="What will the buyer be able to do or achieve after using this?"
              className="input"
            />
          </Field>

          <Field label="Tone reference (optional)">
            <input
              value={form.toneReference}
              onChange={(e) => update("toneReference", e.target.value)}
              placeholder="e.g. Warm and direct, like talking to a smart friend"
              className="input"
            />
          </Field>

          <Field label="Desired number of chapters/modules (optional)">
            <input
              type="number"
              min={1}
              max={20}
              value={form.chapterCountRequested}
              onChange={(e) => update("chapterCountRequested", e.target.value)}
              placeholder="Leave blank to let Claude decide"
              className="input"
            />
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-neutral-900 px-4 py-3 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create product & generate outline"}
          </button>
        </form>
      </main>
      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid #d4d4d4;
          border-radius: 0.5rem;
          padding: 0.6rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus {
          border-color: #171717;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-neutral-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
