"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Icons
function DashboardIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

function BlocksIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="8" height="8" x="3" y="3" rx="2" />
      <rect width="8" height="8" x="13" y="3" rx="2" />
      <rect width="8" height="8" x="3" y="13" rx="2" />
      <rect width="8" height="8" x="13" y="13" rx="2" />
    </svg>
  );
}

function AnalyticsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  );
}

function MenuToggleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  );
}

// Navigation items for the sidebar
const navItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: <DashboardIcon />,
  },
  {
    name: "Block Options",
    href: "/blocks",
    icon: <BlocksIcon />,
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: <AnalyticsIcon />,
  },
];

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "sidebar",
        collapsed && "sidebar-collapsed",
        className
      )}
    >
      <div className="flex flex-col h-full">
        <div className="p-4 flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-md bg-gradient-to-r from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold mr-2">
                E
              </div>
              <h1 className="text-lg font-medium gradient-text">Eigen</h1>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-md hover:bg-zinc-800 text-zinc-400"
            aria-label="Toggle sidebar"
          >
            <MenuToggleIcon />
          </button>
        </div>

        <div className="mt-4 px-3 flex-1">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "sidebar-item",
                  pathname === item.href && "sidebar-item-active",
                  collapsed && "justify-center"
                )}
              >
                <span className="mr-3">{item.icon}</span>
                {!collapsed && <span>{item.name}</span>}
              </Link>
            ))}
          </nav>
        </div>

        <div className="p-4 mt-auto">
          {!collapsed && (
            <div className="bg-zinc-900 rounded-lg p-3 text-xs text-zinc-400 border border-zinc-800">
              <p className="font-medium mb-1">Ethereum Mainnet</p>
              <div className="flex items-center">
                <div className="h-2 w-2 rounded-full bg-purple-500 mr-2"></div>
                <span>Connected</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 