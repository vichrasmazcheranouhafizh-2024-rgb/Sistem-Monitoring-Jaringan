"use client";

import { useState, useCallback } from "react";
import { Sidebar, MobileNav, type ViewKey } from "@/components/layout/sidebar";
import { Dashboard } from "@/components/views/dashboard";
import { Bandwidth } from "@/components/views/bandwidth";
import { Quality } from "@/components/views/quality";
import { InterfaceView } from "@/components/views/interface";
import { Scanner } from "@/components/views/scanner";
import { Processes } from "@/components/views/processes";
import { AIInsights } from "@/components/views/ai-insights";
import { Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePolling } from "@/hooks/use-polling";
import { timeAgo } from "@/lib/format";

interface CpuData {
  overallUsage: number;
  coreCount: number;
  loadavg: { "1m": number };
}
interface BwData {
  interfaces: Array<{ downloadBps: number; uploadBps: number }>;
}

export default function Home() {
  const [view, setView] = useState<ViewKey>("dashboard");
  const [healthScore, setHealthScore] = useState<number | undefined>(undefined);

  // Light polling for top bar status
  const cpu = usePolling<CpuData>("/api/metrics/cpu", { intervalMs: 3000 });
  const bw = usePolling<BwData>("/api/metrics/bandwidth", { intervalMs: 2000 });

  const onHealthComputed = useCallback((s: number) => {
    setHealthScore(s);
  }, []);

  return (
    <div className="min-h-screen flex flex-col mesh-bg bg-background">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border/60 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="size-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Activity className="size-4.5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-semibold text-sm leading-tight">NetPulse</h1>
            <p className="text-[10px] text-muted-foreground leading-tight">Network Monitor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {typeof healthScore === "number" && (
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground leading-tight">Skor</div>
              <div className="text-sm font-bold text-emerald-600 leading-tight">{healthScore}</div>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1">
        <Sidebar active={view} onChange={setView} healthScore={healthScore} />

        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-5 sm:py-7 pb-24 lg:pb-8 max-w-[1400px] mx-auto w-full">
          {/* Top status bar (desktop) */}
          <div className="hidden lg:flex items-center justify-between gap-4 mb-5 pb-4 border-b border-border/40">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                {VIEW_TITLES[view].title}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">{VIEW_TITLES[view].desc}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusPill
                label="CPU"
                value={`${(cpu.data?.overallUsage ?? 0).toFixed(0)}%`}
                accent={(cpu.data?.overallUsage ?? 0) < 50 ? "emerald" : (cpu.data?.overallUsage ?? 0) < 80 ? "amber" : "rose"}
              />
              <StatusPill
                label="↓ DL"
                value={bw.data?.interfaces?.[0] ? formatBps(bw.data.interfaces[0].downloadBps) : "—"}
                accent="emerald"
              />
              <StatusPill
                label="↑ UL"
                value={bw.data?.interfaces?.[0] ? formatBps(bw.data.interfaces[0].uploadBps) : "—"}
                accent="sky"
              />
              <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 border border-border/60 rounded-full px-2.5 py-1.5">
                <Activity className="size-3 text-emerald-500" />
                <span>Live</span>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
            >
              {view === "dashboard" && <Dashboard onHealthComputed={onHealthComputed} />}
              {view === "bandwidth" && <Bandwidth />}
              {view === "quality" && <Quality />}
              {view === "interface" && <InterfaceView />}
              {view === "scanner" && <Scanner />}
              {view === "processes" && <Processes />}
              {view === "ai" && <AIInsights />}
            </motion.div>
          </AnimatePresence>

          {/* Footer */}
          <footer className="mt-12 pt-6 border-t border-border/40 text-center text-xs text-muted-foreground">
            <p>
              <strong className="text-foreground">NetPulse</strong> · Network Monitoring &amp; Management Tool
            </p>
            <p className="mt-1">
              Tugas Besar Desain Manajemen Jaringan · Teknik Informatika · Universitas Muhammadiyah Surabaya
            </p>
          </footer>
        </main>
      </div>

      <MobileNav active={view} onChange={setView} healthScore={healthScore} />
    </div>
  );
}

const VIEW_TITLES: Record<ViewKey, { title: string; desc: string }> = {
  dashboard: { title: "Dashboard", desc: "Ringkasan kesehatan jaringan & sistem secara real-time" },
  bandwidth: { title: "Bandwidth", desc: "Throughput download/upload dan utilisasi bandwidth" },
  quality: { title: "Kualitas Koneksi", desc: "Latency, jitter, dan packet loss ke multiple target" },
  interface: { title: "Network Interface", desc: "Detail IP, MAC, gateway, dan DNS" },
  scanner: { title: "Device Scanner", desc: "Discovery perangkat dalam jaringan lokal" },
  processes: { title: "Proses & CPU", desc: "Monitoring proses dan utilisasi multi-core" },
  ai: { title: "AI Insights", desc: "Rekomendasi cerdas berbasis AI" },
};

function StatusPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "emerald" | "sky" | "amber" | "rose";
}) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
    sky: "bg-sky-50 text-sky-700 border-sky-200/60",
    amber: "bg-amber-50 text-amber-700 border-amber-200/60",
    rose: "bg-rose-50 text-rose-700 border-rose-200/60",
  };
  return (
    <div className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1.5 border ${colors[accent]}`}>
      <span className="opacity-70">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function formatBps(bps: number): string {
  if (!bps) return "0 B/s";
  const k = 1024;
  const sizes = ["B/s", "KB/s", "MB/s", "GB/s"];
  const i = Math.floor(Math.log(bps) / Math.log(k));
  return `${(bps / Math.pow(k, i)).toFixed(1)} ${sizes[Math.min(i, sizes.length - 1)]}`;
}
