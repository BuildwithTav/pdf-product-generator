import { Sidebar } from "@/components/shell/Sidebar";
import { StepsProvider } from "@/components/shell/StepsContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StepsProvider>
      <div className="flex bg-app-bg">
        <Sidebar />
        <main className="min-h-screen flex-1 overflow-y-auto">{children}</main>
      </div>
    </StepsProvider>
  );
}
