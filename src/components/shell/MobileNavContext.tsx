"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";

interface Ctx {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
}

const MobileNav = createContext<Ctx | null>(null);

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Auto-close on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  return (
    <MobileNav.Provider value={{ open, setOpen, toggle }}>
      {children}
    </MobileNav.Provider>
  );
}

export function useMobileNav() {
  const v = useContext(MobileNav);
  if (!v) throw new Error("useMobileNav must be used inside MobileNavProvider");
  return v;
}
