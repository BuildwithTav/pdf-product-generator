import Link from "next/link";
import { Sparkles, FileText, Palette, Wand2 } from "lucide-react";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { Button } from "@/components/ui/Button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-app-bg px-6 text-center">
      <div className="flex items-center gap-2 text-app-ink">
        <Sparkles className="h-6 w-6 text-app-accent" />
        <span className="font-display text-lg font-medium">PDF Product Generator</span>
      </div>
      <EyebrowLabel>No account · No design skill required</EyebrowLabel>
      <h1 className="mt-3 max-w-2xl font-display text-5xl font-medium leading-tight text-app-ink">
        Fill in a form. Get a <em className="italic text-app-accent">sellable</em> digital product PDF.
      </h1>
      <p className="mt-4 max-w-xl text-app-muted">
        Describe your product, review the AI-generated outline, and watch it become a fully
        written, fully designed PDF — cover, layout, and all.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Feature icon={<Wand2 className="h-5 w-5" />} title="AI outline & content" />
        <Feature icon={<Palette className="h-5 w-5" />} title="AI design brief" />
        <Feature icon={<FileText className="h-5 w-5" />} title="PDF + Markdown export" />
      </div>
      <Link href="/new" className="mt-10">
        <Button variant="primary">Create your first product</Button>
      </Link>
    </div>
  );
}

function Feature({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-app-border bg-app-surface p-5 text-sm font-medium text-app-ink">
      <span className="text-app-accent">{icon}</span>
      {title}
    </div>
  );
}
