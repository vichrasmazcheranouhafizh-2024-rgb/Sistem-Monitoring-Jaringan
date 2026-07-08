"use client";

import { usePolling } from "@/hooks/use-polling";
import { formatBytes, formatSpeed, formatNumber, timeAgo } from "@/lib/format";
import { StatCard, SectionTitle, LiveDot } from "./shared";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Gauge,
  Package,
  AlertTriangle,
  Network,
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
    rxErrors: number;
    txErrors: number;
    rxDrops: number;
    txDrops: number;
    peakDownBps: number;
    peakUpBps: number;
    avgDownBps: number;
    avgUpBps: number;
    series: Array<{ ts: number; download: number; upload: number }>;
  }>;
}

export function Bandwidth() {
  const { data, lastUpdated } = usePolling<BandwidthData>("/api/metrics/bandwidth", {
    intervalMs: 1500,
  });

  const primary = data?.interfaces?.[0];
  const series = primary?.series ?? [];

  const chartData = series.map((s) => ({
    ts: s.ts,
    download: s.download,
    upload: s.upload,
    time: new Date(s.ts).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  }));

  const ASSUMED_CAPACITY_BPS = 1_000_000_000 / 8; // 1 Gbps in B/s
  const utilization = primary
    ? Math.min(100, (primary.downloadBps / ASSUMED_CAPACITY_BPS) * 100)
    : 0;
  const upUtilization = primary
    ? Math.min(100, (primary.uploadBps / ASSUMED_CAPACITY_BPS) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Bandwidth & Throughput"
        description="Pengukuran kecepatan download/upload, throughput aktual, dan utilisasi kapasitas bandwidth secara real-time."
        icon={Gauge}
        action={<LiveDot />}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Download"
          value={primary ? formatSpeed(primary.downloadBps) : "—"}
          icon={ArrowDownToLine}
          accent="emerald"
          subtitle={primary ? `Avg ${formatSpeed(primary.avgDownBps)}` : undefined}
        />
        <StatCard
          title="Upload"
          value={primary ? formatSpeed(primary.uploadBps) : "—"}
          icon={ArrowUpFromLine}
          accent="sky"
          subtitle={primary ? `Avg ${formatSpeed(primary.avgUpBps)}` : undefined}
        />
        <StatCard
          title="Peak Download"
          value={primary ? formatSpeed(primary.peakDownBps) : "—"}
          icon={Gauge}
          accent="violet"
          subtitle="Tertinggi tercatat"
          delay={0.05}
        />
        <StatCard
          title="Total Transfer"
          value={primary ? formatBytes(primary.rxBytes + primary.txBytes) : "—"}
          icon={Package}
          accent="teal"
          subtitle={primary ? `↓ ${formatBytes(primary.rxBytes)} · ↑ ${formatBytes(primary.txBytes)}` : undefined}
          delay={0.1}
        />
      </div>

      {/* Real-time chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Grafik Throughput Real-time</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {primary ? `Interface: ${primary.name}` : "Memuat..."} · Diperbarui {timeAgo(lastUpdated)}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-72 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gDown2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gUp2" x1="0" y1="0" x2="0" y2="1">
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
                  minTickGap={50}
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
                  formatter={(value: number, name: string) => [
                    formatSpeed(value),
                    name === "download" ? "Download" : "Upload",
                  ]}
                />
                <Area type="monotone" dataKey="download" stroke="#10b981" strokeWidth={2.5} fill="url(#gDown2)" isAnimationActive={false} />
                <Area type="monotone" dataKey="upload" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#gUp2)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Utilization Bars + Packet Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-base font-semibold">Utilisasi Kapasitas Bandwidth</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Asumsi kapasitas link: 1 Gbps (1000 Mbps)
            </p>
          </CardHeader>
          <CardContent className="space-y-5 pt-2">
            <UtilizationBar
              label="Download"
              value={utilization}
              current={primary ? formatSpeed(primary.downloadBps) : "—"}
              color="emerald"
            />
            <UtilizationBar
              label="Upload"
              value={upUtilization}
              current={primary ? formatSpeed(primary.uploadBps) : "—"}
              color="sky"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-base font-semibold">Statistik Paket</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Counter kumulatif interface {primary?.name ?? "—"}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <PacketTile label="Paket Diterima" value={primary ? formatNumber(primary.rxPackets) : "—"} accent="emerald" />
              <PacketTile label="Paket Dikirim" value={primary ? formatNumber(primary.txPackets) : "—"} accent="sky" />
              <PacketTile
                label="Error RX"
                value={primary ? formatNumber(primary.rxErrors) : "—"}
                accent={primary && primary.rxErrors > 0 ? "rose" : "emerald"}
              />
              <PacketTile
                label="Error TX"
                value={primary ? formatNumber(primary.txErrors) : "—"}
                accent={primary && primary.txErrors > 0 ? "rose" : "emerald"}
              />
              <PacketTile
                label="Drop RX"
                value={primary ? formatNumber(primary.rxDrops) : "—"}
                accent={primary && primary.rxDrops > 0 ? "amber" : "emerald"}
              />
              <PacketTile
                label="Drop TX"
                value={primary ? formatNumber(primary.txDrops) : "—"}
                accent={primary && primary.txDrops > 0 ? "amber" : "emerald"}
              />
            </div>
            {(primary?.rxErrors > 0 || primary?.txErrors > 0 || primary?.rxDrops > 0 || primary?.txDrops > 0) && (
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Terdeteksi error/drop paket</p>
                  <p className="mt-0.5">Error dan drop paket dapat mengindikasikan kongesti, masalah kabel, atau interferensi. Pertimbangkan untuk memeriksa physical link.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* All interfaces */}
      <Card>
        <CardHeader className="pb-2">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Network className="size-4.5 text-teal-600" />
            Semua Interface Jaringan
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total {data?.interfaces?.length ?? 0} interface aktif
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
                  <th className="py-2 pr-4 font-medium">Interface</th>
                  <th className="py-2 pr-4 font-medium text-right">Download</th>
                  <th className="py-2 pr-4 font-medium text-right">Upload</th>
                  <th className="py-2 pr-4 font-medium text-right">Total RX</th>
                  <th className="py-2 pr-4 font-medium text-right">Total TX</th>
                  <th className="py-2 font-medium text-right">Peak Down</th>
                </tr>
              </thead>
              <tbody>
                {(data?.interfaces ?? []).map((iface) => (
                  <tr key={iface.name} className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 pr-4 font-mono font-medium">{iface.name}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-emerald-700">{formatSpeed(iface.downloadBps)}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-sky-700">{formatSpeed(iface.uploadBps)}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{formatBytes(iface.rxBytes)}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{formatBytes(iface.txBytes)}</td>
                    <td className="py-2.5 text-right tabular-nums text-violet-700">{formatSpeed(iface.peakDownBps)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UtilizationBar({
  label,
  value,
  current,
  color,
}: {
  label: string;
  value: number;
  current: string;
  color: "emerald" | "sky";
}) {
  const colors = {
    emerald: { from: "from-emerald-400", to: "to-teal-500", text: "text-emerald-700" },
    sky: { from: "from-sky-400", to: "to-cyan-500", text: "text-sky-700" },
  };
  const c = colors[color];
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm font-medium">{label}</span>
        <div className="text-right">
          <span className={`text-sm font-semibold ${c.text} tabular-nums`}>{value.toFixed(2)}%</span>
          <span className="text-xs text-muted-foreground ml-2 tabular-nums">{current}</span>
        </div>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${c.from} ${c.to} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(2, value)}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function PacketTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "emerald" | "sky" | "amber" | "rose";
}) {
  const colors = {
    emerald: "bg-emerald-50 border-emerald-200/60 text-emerald-700",
    sky: "bg-sky-50 border-sky-200/60 text-sky-700",
    amber: "bg-amber-50 border-amber-200/60 text-amber-700",
    rose: "bg-rose-50 border-rose-200/60 text-rose-700",
  };
  return (
    <div className={`rounded-lg border p-3 ${colors[accent]}`}>
      <div className="text-[11px] font-medium opacity-80">{label}</div>
      <div className="text-lg font-semibold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
