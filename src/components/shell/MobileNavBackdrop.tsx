"use client";

import { useMobileNav } from "./MobileNavContext";

export default function MobileNavBackdrop() {
  const { open, setOpen } = useMobileNav();
  if (!open) return null;
  return (
    <button
      type="button"
      aria-label="Close navigation"
      onClick={() => setOpen(false)}
      className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
    />
  );
}
