import { Sidebar } from "@/components/shell/Sidebar";
import { StepsProvider } from "@/components/shell/StepsContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StepsProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-app-bg md:flex-row">
        <Sidebar />
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </StepsProvider>
  );
}
