import { Card } from "@/components/ui/Card";

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-3xl">
      <Card variant="elevated" className="p-6">
        <div className="section-label">Workspace</div>
        <div className="mt-2 font-display text-2xl">Settings</div>
        <p className="mt-3 text-sm text-[var(--color-fg-muted)]">
          Configuration is currently scoped to environment variables. UI controls coming soon.
        </p>
      </Card>
    </div>
  );
}
