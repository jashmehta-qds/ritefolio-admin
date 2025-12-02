"use client";

import { useState } from "react";
import { Sidebar, MobileSidebarOverlay } from "./Sidebar";
import { MobileSidebarToggle } from "./MobileSidebarToggle";

export const SidebarWrapper = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      <MobileSidebarOverlay isOpen={isSidebarOpen} onClose={closeSidebar} />

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      {/* Mobile Sidebar Toggle Button */}
      <MobileSidebarToggle onToggle={toggleSidebar} />
    </>
  );
};
