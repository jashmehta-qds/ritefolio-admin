"use client";

import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "sidebar-collapsed";

interface SidebarContextValue {
  isCollapsed: boolean;
  toggleCollapsed: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  isCollapsed: false,
  toggleCollapsed: () => {},
});

export const SidebarProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Restore after mount so server and client render the same initial markup
  useEffect(() => {
    try {
      setIsCollapsed(localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      // Storage unavailable (e.g. private mode) — keep default
    }
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignore storage failures; state still toggles for this session
      }
      return next;
    });
  };

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => useContext(SidebarContext);
