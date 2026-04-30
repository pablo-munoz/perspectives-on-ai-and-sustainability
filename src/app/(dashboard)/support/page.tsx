import { Card } from "@/components/ui/Card";

export default function SupportPage() {
  return (
    <div className="p-8 max-w-3xl">
      <Card variant="elevated" className="p-6">
        <div className="section-label">Help</div>
        <div className="mt-2 font-display text-2xl">Support</div>
        <p className="mt-3 text-sm text-[var(--color-fg-muted)]">
          For issues or data source questions, contact the Fire-See operations team.
        </p>
      </Card>
    </div>
  );
}
