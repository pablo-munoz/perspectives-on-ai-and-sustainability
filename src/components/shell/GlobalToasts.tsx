"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAlerts, useFirms } from "@/lib/hooks";

export default function GlobalToasts() {
  const { firms } = useFirms();
  const { alerts } = useAlerts();
  const lastHotspotIds = useRef<Set<string>>(new Set());
  const lastAlertIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    if (!firms?.hotspots) return;
    const ids = new Set(firms.hotspots.map((h) => h.id));
    if (initialized.current) {
      const newIds = [...ids].filter((id) => !lastHotspotIds.current.has(id));
      if (newIds.length > 0) {
        toast.error(
          `${newIds.length} new fire detection${newIds.length > 1 ? "s" : ""}`,
          {
            description:
              "FIRMS satellite reported new thermal anomaly in Ourense.",
            duration: 6000,
          }
        );
      }
    }
    lastHotspotIds.current = ids;
  }, [firms]);

  useEffect(() => {
    if (!alerts?.alerts) return;
    const ids = new Set(alerts.alerts.map((a) => a.id));
    if (initialized.current) {
      const newAlerts = alerts.alerts.filter(
        (a) =>
          !lastAlertIds.current.has(a.id) && a.severity === "critical"
      );
      newAlerts.forEach((a) => {
        toast.warning(a.title, { description: a.description, duration: 7000 });
      });
    }
    lastAlertIds.current = ids;
    initialized.current = true;
  }, [alerts]);

  return null;
}
