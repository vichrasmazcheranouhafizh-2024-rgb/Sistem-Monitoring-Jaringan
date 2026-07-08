"use client";

import { usePolling } from "@/hooks/use-polling";
import {
  formatBytes,
  formatSpeed,
  formatUptime,
  computeHealthScore,
  timeAgo,
} from "@/lib/format";
import { StatCard, SectionTitle, LiveDot } from "./shared";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  Cpu,
  Gauge,
  MemoryStick,
  Network,
  Server,
  ShieldCheck,
  Signal,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface BandwidthData {
  ts: number;
  interfaces: Array<{
    name: string;
    downloadBps: number;
    uploadBps: number;
    rxBytes: number;
    txBytes: number;
    rxPackets: number;
    txPackets: number;
    peakDownBps: number;
    peakUpBps: number;
    avgDownBps: number;
    avgUpBps: number;
    series: Array<{ ts: number; download: number; upload: number }>;
  }>;
}
interface QualityData {
  ts: number;
  targets: Array<{
    name: string;
    host: string;
    location: string;
    rttAvg: number | null;
    rttMin: number | null;
    rttMax: number | null;
    mdev: number | null;
    packetLoss: number;
    samples: number[];
  }>;
}
interface CpuData {
  ts: number;
  coreCount: number;
  overallUsage: number;
  perCore: Array<{ name: string; usage: number }>;
  loadavg: { "1m": number; "5m": number; "15m": number; running: string };
  uptimeSec: number;
}
interface ProcData {
  ts: number;
  processes: any[];
  tagSummary: Array<{ tag: string; cpu: number; mem: number; count: number }>;
  memory: { totalKB: number; usedKB: number; usagePercent: number };
}
interface IfaceData {
  ts: number;
  hostname: string;
  interfaces: any[];
  gateway: string;
  gatewayIface: string;
  dnsServers: string[];
}

interface DashboardProps {
  onHealthComputed?: (score: number) => void;
}

export function Dashboard({ onHealthComputed }: DashboardProps) {
  const bw = usePolling<BandwidthData>("/api/metrics/bandwidth", { intervalMs: 2000 });
  const quality = usePolling<QualityData>("/api/metrics/quality", { intervalMs: 8000 });
  const cpu = usePolling<CpuData>("/api/metrics/cpu", { intervalMs: 2000 });
  const proc = usePolling<ProcData>("/api/metrics/processes", { intervalMs: 4000 });
  const iface = usePolling<IfaceData>("/api/metrics/interface", { intervalMs: 15000 });

  const primaryIface = bw.data?.interfaces?.[0];
  const targets = quality.data?.targets ?? [];
  const avgLatency =
    targets.length > 0
      ? targets.filter((t) => t.rttAvg !== null).reduce((a, t) => a + (t.rttAvg ?? 0), 0) /
        Math.max(1, targets.filter((t) => t.rttAvg !== null).length)
      : 0;
  const avgLoss =
    targets.length > 0 ? targets.reduce((a, t) => a + t.packetLoss, 0) / targets.length : 0;
  const avgJitter =
    targets.length > 0
      ? targets.filter((t) => t.mdev !== null).reduce((a, t) => a + (t.mdev ?? 0), 0) /
        Math.max(1, targets.filter((t) => t.mdev !== null).length)
      : 0;

  const memUsage = proc.data?.memory?.usagePercent ?? 0;
  const cpuUsage = cpu.data?.overallUsage ?? 0;

  // Estimate bandwidth utilization (assume 1 Gbps cap if unknown)
  const bandwidthUtil = primaryIface
    ? Math.min(100, ((primaryIface.downloadBps + primaryIface.uploadBps) / (1_000_000_000 / 8)) * 100)
    : 0;

  const health = computeHealthScore({
    packetLoss: avgLoss,
    avgLatency,
    jitter: avgJitter,
    cpuUsage,
    memUsage,
    bandwidthUtil,
  });

  useEffect(() => {
    onHealthComputed?.(health.score);
  }, [health.score, onHealthComputed]);

  const series = primaryIface?.series ?? [];
  const chartData = series.map((s) => ({
    ts: s.ts,
    download: s.download,
    upload: s.upload,
    time: new Date(s.ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  }));

  const topProcesses = (proc.data?.processes ?? []).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Hero: Health Score + KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="md:col-span-2 lg:col-span-1"
        >
          <Card className="h-full bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-600 text-white border-0 shadow-xl shadow-emerald-500/30 overflow-hidden relative">
            <div className="absolute inset-0 opacity-30" style={{
              backgroundImage: "radial-gradient(circle at 20% 30%, white 0%, transparent 40%)",
            }} />
            <CardContent className="p-5 relative">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-white/80 uppercase tracking-wider">
                  Skor Kesehatan
                </p>
                <ShieldCheck className="size-5 text-white/80" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-5xl font-bold tabular-nums">{health.score}</span>
                <span className="text-xl font-medium text-white/80">/100</span>
              </div>
              <div className="mt-1">
                <p className="text-sm font-medium text-white/90">{health.label}</p>
                <p className="text-[11px] text-white/70 mt-0.5">
                  Loss {avgLoss.toFixed(1)}% · Latency {avgLatency.toFixed(0)}ms · CPU {cpuUsage.toFixed(0)}%
                </p>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-white/20 overflow-hidden">
                <motion.div
                  className="h-full bg-white rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${health.score}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <StatCard
          title="Download"
          value={primaryIface ? formatSpeed(primaryIface.downloadBps) : "—"}
          icon={ArrowDownToLine}
          accent="emerald"
          subtitle={primaryIface ? `Peak ${formatSpeed(primaryIface.peakDownBps)}` : undefined}
          delay={0.05}
        />
        <StatCard
          title="Upload"
          value={primaryIface ? formatSpeed(primaryIface.uploadBps) : "—"}
          icon={ArrowUpFromLine}
          accent="sky"
          subtitle={primaryIface ? `Peak ${formatSpeed(primaryIface.peakUpBps)}` : undefined}
          delay={0.1}
        />
        <StatCard
          title="Latency Rata-rata"
          value={avgLatency.toFixed(0)}
          unit="ms"
          icon={Signal}
          accent="violet"
          subtitle={`${targets.length} target dipantau`}
          delay={0.15}
        />
      </div>

      {/* Real-time Throughput Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Gauge className="size-4.5 text-emerald-600" />
                Throughput Real-time
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {primaryIface ? `Interface ${primaryIface.name} · ${formatBytes(primaryIface.rxBytes + primaryIface.txBytes)} total transfer` : "Memuat..."}
              </p>
            </div>
            <LiveDot />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-56 sm:h-64 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gDown" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gUp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.4} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={40}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatSpeed(v, 0)}
                  width={70}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    fontSize: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                  formatter={(value: number, name: string) => [formatSpeed(value), name === "download" ? "Download" : "Upload"]}
                />
                <Area
                  type="monotone"
                  dataKey="download"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#gDown)"
                  name="download"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="upload"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  fill="url(#gUp)"
                  name="upload"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* KPI grid 2nd row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Packet Loss"
          value={avgLoss.toFixed(1)}
          unit="%"
          icon={Activity}
          accent={avgLoss < 1 ? "emerald" : avgLoss < 5 ? "amber" : "rose"}
          subtitle={`Jitter ${avgJitter.toFixed(1)} ms`}
          delay={0}
        />
        <StatCard
          title="CPU Usage"
          value={cpuUsage.toFixed(0)}
          unit="%"
          icon={Cpu}
          accent={cpuUsage < 50 ? "emerald" : cpuUsage < 80 ? "amber" : "rose"}
          subtitle={`${cpu.data?.coreCount ?? 0} core aktif`}
          delay={0.05}
        />
        <StatCard
          title="Memory"
          value={memUsage.toFixed(0)}
          unit="%"
          icon={MemoryStick}
          accent={memUsage < 60 ? "emerald" : memUsage < 85 ? "amber" : "rose"}
          subtitle={proc.data ? `${formatBytes(proc.data.memory.usedKB * 1024)} / ${formatBytes(proc.data.memory.totalKB * 1024)}` : undefined}
          delay={0.1}
        />
        <StatCard
          title="Uptime"
          value={formatUptime(cpu.data?.uptimeSec ?? 0).split(" ").slice(0, 2).join(" ")}
          icon={Server}
          accent="teal"
          subtitle={`Load ${cpu.data?.loadavg["1m"].toFixed(2) ?? "—"}`}
          delay={0.15}
        />
      </div>

      {/* Two column: Network Quality + Top Processes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Network className="size-4.5 text-violet-600" />
              Kualitas Koneksi per Target
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Diperbarui {timeAgo(quality.lastUpdated)} · {targets.length} target
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {targets.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">Memuat ping...</div>
            )}
            {targets.map((t, i) => (
              <motion.div
                key={t.host}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors"
              >
                <div className="size-9 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                  <Server className="size-4 text-violet-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{t.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                      {t.location}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono">{t.host}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold tabular-nums">
                    {t.rttAvg !== null ? `${t.rttAvg.toFixed(1)} ms` : "timeout"}
                  </div>
                  <div className={`text-[11px] font-medium ${t.packetLoss < 1 ? "text-emerald-600" : t.packetLoss < 5 ? "text-amber-600" : "text-rose-600"}`}>
                    Loss {t.packetLoss.toFixed(1)}%
                  </div>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Zap className="size-4.5 text-amber-600" />
              Proses Teratas (CPU)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {topProcesses.length} proses paling membebani
            </p>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {topProcesses.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">Memuat proses...</div>
            )}
            {topProcesses.map((p, i) => (
              <motion.div
                key={p.pid}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors"
              >
                <div className="size-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-amber-700 tabular-nums">{i + 1}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{p.comm}</div>
                  <div className="text-[11px] text-muted-foreground">
                    PID {p.pid} · {p.user}
                    {p.tags?.length > 0 && (
                      <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-muted">
                        {p.tags[0]}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold tabular-nums text-amber-700">
                    {p.cpu.toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-muted-foreground tabular-nums">
                    RAM {p.mem.toFixed(1)}%
                  </div>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
