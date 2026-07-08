"use client";

import { usePolling } from "@/hooks/use-polling";
import {
  formatBytes,
  formatNumber,
  formatUptime,
  timeAgo,
} from "@/lib/format";
import { StatCard, SectionTitle, LiveDot, EmptyState } from "./shared";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Cpu,
  MemoryStick,
  Activity,
  Zap,
  Clock,
  Server,
  Search,
  AlertCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from "recharts";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";

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
  memory: {
    totalKB: number;
    usedKB: number;
    availKB: number;
    usagePercent: number;
    buffersKB: number;
    cachedKB: number;
    swapTotalKB: number;
    swapFreeKB: number;
  };
}

export function Processes() {
  const cpu = usePolling<CpuData>("/api/metrics/cpu", { intervalMs: 2000 });
  const proc = usePolling<ProcData>("/api/metrics/processes", { intervalMs: 4000 });
  const [filter, setFilter] = useState("");

  const mem = proc.data?.memory;
  const processes = proc.data?.processes ?? [];
  const tagSummary = proc.data?.tagSummary ?? [];

  const filteredProcesses = useMemo(() => {
    if (!filter.trim()) return processes;
    const q = filter.toLowerCase();
    return processes.filter(
      (p) =>
        p.comm?.toLowerCase().includes(q) ||
        p.args?.toLowerCase().includes(q) ||
        p.user?.toLowerCase().includes(q) ||
        String(p.pid).includes(q)
    );
  }, [processes, filter]);

  const cpuOverall = cpu.data?.overallUsage ?? 0;
  const memUsage = mem?.usagePercent ?? 0;

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Proses & Multi-core"
        description="Mengidentifikasi proses yang sedang berjalan dan dampaknya terhadap utilisasi multi-core CPU. Khususnya aplikasi intensif: Browser, Zoom, YouTube, Web AI."
        icon={Cpu}
        action={<LiveDot />}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="CPU Usage"
          value={cpuOverall.toFixed(0)}
          unit="%"
          icon={Cpu}
          accent={cpuOverall < 50 ? "emerald" : cpuOverall < 80 ? "amber" : "rose"}
          subtitle={`${cpu.data?.coreCount ?? 0} core`}
        />
        <StatCard
          title="Memory"
          value={memUsage.toFixed(0)}
          unit="%"
          icon={MemoryStick}
          accent={memUsage < 60 ? "emerald" : memUsage < 85 ? "amber" : "rose"}
          subtitle={mem ? `${formatBytes(mem.usedKB * 1024)} / ${formatBytes(mem.totalKB * 1024)}` : undefined}
        />
        <StatCard
          title="Load Average (1m)"
          value={cpu.data?.loadavg["1m"].toFixed(2) ?? "—"}
          icon={Activity}
          accent="violet"
          subtitle={`5m: ${cpu.data?.loadavg["5m"].toFixed(2) ?? "—"} · 15m: ${cpu.data?.loadavg["15m"].toFixed(2) ?? "—"}`}
          delay={0.05}
        />
        <StatCard
          title="Uptime"
          value={formatUptime(cpu.data?.uptimeSec ?? 0).split(" ").slice(0, 2).join(" ")}
          icon={Clock}
          accent="teal"
          subtitle={`Running: ${cpu.data?.loadavg.running ?? "—"}`}
          delay={0.1}
        />
      </div>

      {/* Multi-core visualization */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Cpu className="size-4.5 text-emerald-600" />
                Utilisasi Multi-core
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {cpu.data?.coreCount ?? 0} core · Diperbarui {timeAgo(cpu.lastUpdated)}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {cpu.data && cpu.data.perCore.length > 0 ? (
            <>
              {/* Core bars grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 mb-4">
                {cpu.data.perCore.map((core, i) => {
                  const usage = core.usage;
                  const color =
                    usage < 50
                      ? "from-emerald-400 to-teal-500"
                      : usage < 80
                      ? "from-amber-400 to-orange-500"
                      : "from-rose-400 to-red-500";
                  return (
                    <motion.div
                      key={core.name}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="rounded-lg border border-border/60 bg-card p-2.5"
                    >
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-[11px] font-mono text-muted-foreground">{core.name}</span>
                        <span className="text-xs font-semibold tabular-nums">{usage.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className={`h-full bg-gradient-to-r ${color} rounded-full`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(2, usage)}%` }}
                          transition={{ duration: 0.4 }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Per-core chart */}
              <div className="h-44 -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cpu.data.perCore}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.4} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      width={36}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                      formatter={(v: number) => [`${v.toFixed(1)}%`, "Usage"]}
                    />
                    <Bar dataKey="usage" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                      {cpu.data.perCore.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={
                            entry.usage < 50
                              ? "#10b981"
                              : entry.usage < 80
                              ? "#f59e0b"
                              : "#f43f5e"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <EmptyState icon={Cpu} title="Memuat data CPU..." />
          )}
        </CardContent>
      </Card>

      {/* Memory breakdown + Tag aggregation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <MemoryStick className="size-4.5 text-sky-600" />
              Detail Memory
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Total {mem ? formatBytes(mem.totalKB * 1024) : "—"}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-sm font-medium">Memory Used</span>
                <span className="text-sm font-semibold tabular-nums">
                  {memUsage.toFixed(1)}%
                </span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-sky-400 to-cyan-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${memUsage}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
              <div className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                {mem ? `${formatBytes(mem.usedKB * 1024)} / ${formatBytes(mem.totalKB * 1024)}` : "—"}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <MiniStat label="Tersedia" value={mem ? formatBytes(mem.availKB * 1024) : "—"} />
              <MiniStat label="Buffer" value={mem ? formatBytes(mem.buffersKB * 1024) : "—"} />
              <MiniStat label="Cached" value={mem ? formatBytes(mem.cachedKB * 1024) : "—"} />
              <MiniStat
                label="Swap Used"
                value={
                  mem && mem.swapTotalKB > 0
                    ? formatBytes((mem.swapTotalKB - mem.swapFreeKB) * 1024)
                    : "Nonaktif"
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Zap className="size-4.5 text-amber-600" />
              Kategori Proses (Tag Summary)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Agregasi CPU & memory per kategori aplikasi
            </p>
          </CardHeader>
          <CardContent>
            {tagSummary.length === 0 ? (
              <EmptyState icon={Zap} title="Belum ada data kategori" />
            ) : (
              <div className="space-y-2">
                {tagSummary.slice(0, 8).map((t, i) => (
                  <motion.div
                    key={t.tag}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors"
                  >
                    <div className="size-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-amber-700">{t.count}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t.tag}</span>
                        <span className="text-xs font-semibold text-amber-700 tabular-nums">
                          {t.cpu.toFixed(1)}% CPU
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, t.cpu)}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                        Memory: {t.mem.toFixed(1)}%
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Process table with filter */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Server className="size-4.5 text-violet-600" />
                Daftar Proses Aktif
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {filteredProcesses.length} dari {processes.length} proses · Diurutkan berdasarkan CPU
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari nama, PID, user..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-96 overflow-y-auto rounded-lg border border-border/60">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/40 backdrop-blur-sm">
                <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                  <th className="py-2 px-3 font-medium">PID</th>
                  <th className="py-2 px-3 font-medium">Proses</th>
                  <th className="py-2 px-3 font-medium">User</th>
                  <th className="py-2 px-3 font-medium text-right">CPU%</th>
                  <th className="py-2 px-3 font-medium text-right">MEM%</th>
                  <th className="py-2 px-3 font-medium text-right">RSS</th>
                  <th className="py-2 px-3 font-medium">Tags</th>
                  <th className="py-2 px-3 font-medium">Uptime</th>
                </tr>
              </thead>
              <tbody>
                {filteredProcesses.map((p) => (
                  <tr
                    key={p.pid}
                    className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-2 px-3 font-mono text-xs text-muted-foreground">{p.pid}</td>
                    <td className="py-2 px-3">
                      <div className="font-medium truncate max-w-[240px]">{p.comm}</div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-[240px]">
                        {p.args}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-xs">{p.user}</td>
                    <td className={`py-2 px-3 text-right tabular-nums font-medium ${p.cpu > 50 ? "text-rose-600" : p.cpu > 20 ? "text-amber-600" : "text-foreground"}`}>
                      {p.cpu.toFixed(1)}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">{p.mem.toFixed(1)}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-xs">
                      {formatBytes(p.rssKB * 1024, 0)}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex flex-wrap gap-1">
                        {(p.tags ?? []).slice(0, 2).map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-xs text-muted-foreground font-mono">{p.etime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredProcesses.length === 0 && (
            <div className="py-6">
              <EmptyState
                icon={AlertCircle}
                title="Tidak ada proses yang cocok"
                description="Coba kata kunci lain atau hapus filter."
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2.5">
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
      <div className="text-sm font-semibold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
