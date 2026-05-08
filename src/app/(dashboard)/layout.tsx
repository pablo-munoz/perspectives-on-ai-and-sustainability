import { Toaster } from "sonner";
import Sidebar from "@/components/shell/Sidebar";
import TopBar from "@/components/shell/TopBar";
import GlobalToasts from "@/components/shell/GlobalToasts";
import KeyboardShortcuts from "@/components/shell/KeyboardShortcuts";
import { MobileNavProvider } from "@/components/shell/MobileNavContext";
import MobileNavBackdrop from "@/components/shell/MobileNavBackdrop";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MobileNavProvider>
      <div className="flex h-screen bg-[var(--color-bg)] text-[var(--color-fg)] relative">
        <Sidebar />
        <MobileNavBackdrop />
        <div className="flex-1 min-w-0 flex flex-col">
          <TopBar />
          <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
        </div>

        <GlobalToasts />
        <KeyboardShortcuts />
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              color: "var(--color-fg)",
            },
          }}
        />
      </div>
    </MobileNavProvider>
  );
}
