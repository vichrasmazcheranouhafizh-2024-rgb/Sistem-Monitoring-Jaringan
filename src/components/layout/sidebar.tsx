"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Activity,
  Gauge,
  Wifi,
  ScanLine,
  Cpu,
  Sparkles,
} from "lucide-react";

export type ViewKey =
  | "dashboard"
  | "bandwidth"
  | "quality"
  | "interface"
  | "scanner"
  | "processes"
  | "ai";

interface NavItem {
  key: ViewKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
}

const NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Ringkasan kesehatan" },
  { key: "bandwidth", label: "Bandwidth", icon: Gauge, desc: "Throughput real-time" },
  { key: "quality", label: "Kualitas Koneksi", icon: Activity, desc: "Ping, jitter, loss" },
  { key: "interface", label: "Interface", icon: Wifi, desc: "IP, MAC, gateway, DNS" },
  { key: "scanner", label: "Device Scanner", icon: ScanLine, desc: "Discovery perangkat" },
  { key: "processes", label: "Proses & CPU", icon: Cpu, desc: "Multitasking & multi-core" },
  { key: "ai", label: "AI Insights", icon: Sparkles, desc: "Rekomendasi AI" },
];

interface SidebarProps {
  active: ViewKey;
  onChange: (v: ViewKey) => void;
  healthScore?: number;
}

export function Sidebar({ active, onChange, healthScore }: SidebarProps) {
  return (
    <aside className="hidden lg:flex w-72 shrink-0 flex-col gap-2 p-4 border-r border-border/60 bg-sidebar/40 backdrop-blur-sm">
      <div className="flex items-center gap-3 px-2 py-4">
        <div className="relative">
          <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Activity className="size-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-white" />
        </div>
        <div>
          <h1 className="font-semibold text-base tracking-tight">NetPulse</h1>
          <p className="text-[11px] text-muted-foreground">Network Monitor</p>
        </div>
      </div>

      {typeof healthScore === "number" && (
        <div className="mx-2 mb-2 rounded-xl border border-border/60 bg-gradient-to-br from-emerald-50 to-teal-50/50 p-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
            <span>Skor Kesehatan</span>
            <span className="font-semibold text-emerald-700">{healthScore}/100</span>
          </div>
          <div className="h-1.5 rounded-full bg-emerald-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-700"
              style={{ width: `${healthScore}%` }}
            />
          </div>
        </div>
      )}

      <nav className="flex-1 flex flex-col gap-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all",
                isActive
                  ? "bg-gradient-to-r from-emerald-500/15 to-teal-500/5 text-foreground shadow-sm"
                  : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "size-9 rounded-lg flex items-center justify-center transition-colors",
                  isActive
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                    : "bg-muted/60 text-muted-foreground group-hover:bg-muted"
                )}
              >
                <Icon className="size-4.5" strokeWidth={2.2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className={cn("text-sm font-medium truncate", isActive && "text-foreground")}>
                  {item.label}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">{item.desc}</div>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-[11px] text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Tugas Besar DMJ</span>
          <span className="font-mono text-emerald-700">v1.0</span>
        </div>
        <p className="mt-1">Universitas Muhammadiyah Surabaya</p>
      </div>
    </aside>
  );
}

export function MobileNav({ active, onChange }: SidebarProps) {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-lg">
      <div className="grid grid-cols-7 gap-0.5 p-1.5">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={cn(
                "flex flex-col items-center gap-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors",
                isActive ? "text-emerald-600 bg-emerald-50" : "text-muted-foreground"
              )}
            >
              <Icon className="size-4.5" strokeWidth={2.2} />
              <span className="truncate w-full text-center">{item.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
