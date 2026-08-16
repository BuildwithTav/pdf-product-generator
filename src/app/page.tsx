import Link from "next/link";
import { Sparkles, FileText, Palette, Wand2 } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6 text-center">
      <div className="flex items-center gap-2 text-neutral-900">
        <Sparkles className="h-6 w-6" />
        <span className="text-lg font-semibold">PDF Product Generator</span>
      </div>
      <h1 className="mt-6 max-w-2xl text-4xl font-bold tracking-tight text-neutral-900">
        Fill in a form. Get a sellable digital product PDF.
      </h1>
      <p className="mt-4 max-w-xl text-neutral-500">
        No design skill, no writing skill, no account required. Describe your product, review
        the AI-generated outline, and watch it become a fully written, fully designed PDF.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Feature icon={<Wand2 className="h-5 w-5" />} title="AI outline & content" />
        <Feature icon={<Palette className="h-5 w-5" />} title="AI design brief" />
        <Feature icon={<FileText className="h-5 w-5" />} title="PDF + Markdown export" />
      </div>
      <Link
        href="/new"
        className="mt-10 rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Create your first product
      </Link>
    </div>
  );
}

function Feature({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-neutral-200 bg-white p-5 text-sm font-medium text-neutral-700">
      {icon}
      {title}
    </div>
  );
}
