"use client";

import { usePolling } from "@/hooks/use-polling";
import { timeAgo } from "@/lib/format";
import { StatCard, SectionTitle, LiveDot } from "./shared";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Gauge,
  Server,
  Signal,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { motion } from "framer-motion";

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

export function Quality() {
  const { data, lastUpdated, refetch, loading } = usePolling<QualityData>(
    "/api/metrics/quality",
    { intervalMs: 10000 }
  );

  const targets = data?.targets ?? [];

  const avgLatency =
    targets.filter((t) => t.rttAvg !== null).length > 0
      ? targets.filter((t) => t.rttAvg !== null).reduce((a, t) => a + (t.rttAvg ?? 0), 0) /
        targets.filter((t) => t.rttAvg !== null).length
      : 0;
  const avgLoss = targets.length > 0 ? targets.reduce((a, t) => a + t.packetLoss, 0) / targets.length : 0;
  const avgJitter =
    targets.filter((t) => t.mdev !== null).length > 0
      ? targets.filter((t) => t.mdev !== null).reduce((a, t) => a + (t.mdev ?? 0), 0) /
        targets.filter((t) => t.mdev !== null).length
      : 0;
  const worstLatency = targets.reduce((m, t) => Math.max(m, t.rttAvg ?? 0), 0);

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Kualitas Koneksi"
        description="Grafik latency/ping, jitter, dan packet loss ke beberapa target server lokal & global."
        icon={Activity}
        action={
          <div className="flex items-center gap-2">
            <LiveDot />
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={loading}
              className="h-8 gap-1.5"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Latency Rata-rata"
          value={avgLatency.toFixed(1)}
          unit="ms"
          icon={Signal}
          accent={avgLatency < 50 ? "emerald" : avgLatency < 150 ? "amber" : "rose"}
          subtitle={`Target ${targets.length} host`}
        />
        <StatCard
          title="Packet Loss"
          value={avgLoss.toFixed(2)}
          unit="%"
          icon={Activity}
          accent={avgLoss < 1 ? "emerald" : avgLoss < 5 ? "amber" : "rose"}
          subtitle={avgLoss < 1 ? "Sangat baik" : avgLoss < 5 ? "Perlu perhatian" : "Buruk"}
        />
        <StatCard
          title="Jitter (mdev)"
          value={avgJitter.toFixed(2)}
          unit="ms"
          icon={Gauge}
          accent={avgJitter < 5 ? "emerald" : avgJitter < 20 ? "amber" : "rose"}
          subtitle="Variasi latency"
          delay={0.05}
        />
        <StatCard
          title="Latency Tertinggi"
          value={worstLatency.toFixed(1)}
          unit="ms"
          icon={Server}
          accent="violet"
          subtitle="Target terjauh"
          delay={0.1}
        />
      </div>

      {/* Per-target cards with sparkline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {targets.map((t, i) => {
          const chartData = t.samples.map((s, idx) => ({
            idx: idx + 1,
            value: s,
          }));
          const ok = t.packetLoss < 1 && t.rttAvg !== null;
          const colorClass = ok
            ? "from-emerald-50 to-teal-50/30 border-emerald-200/60"
            : t.packetLoss < 5
            ? "from-amber-50 to-orange-50/30 border-amber-200/60"
            : "from-rose-50 to-red-50/30 border-rose-200/60";
          const lineColor = ok ? "#10b981" : t.packetLoss < 5 ? "#f59e0b" : "#f43f5e";
          return (
            <motion.div
              key={t.host}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card className={`bg-gradient-to-br ${colorClass}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="size-9 rounded-lg bg-white/80 flex items-center justify-center shrink-0">
                        <Server className={`size-4.5 ${ok ? "text-emerald-600" : t.packetLoss < 5 ? "text-amber-600" : "text-rose-600"}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-semibold text-sm truncate">{t.name}</h4>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-mono">
                            {t.location}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono truncate">{t.host}</p>
                      </div>
                    </div>
                    {ok ? (
                      <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="size-5 text-amber-500 shrink-0" />
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <Metric label="Avg" value={t.rttAvg !== null ? `${t.rttAvg.toFixed(1)}` : "—"} unit="ms" />
                    <Metric label="Min" value={t.rttMin !== null ? `${t.rttMin.toFixed(1)}` : "—"} unit="ms" />
                    <Metric label="Max" value={t.rttMax !== null ? `${t.rttMax.toFixed(1)}` : "—"} unit="ms" />
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="rounded-lg bg-white/60 px-2.5 py-1.5">
                      <div className="text-[10px] text-muted-foreground uppercase">Jitter</div>
                      <div className="text-sm font-semibold tabular-nums">
                        {t.mdev !== null ? `${t.mdev.toFixed(2)} ms` : "—"}
                      </div>
                    </div>
                    <div className="rounded-lg bg-white/60 px-2.5 py-1.5">
                      <div className="text-[10px] text-muted-foreground uppercase">Packet Loss</div>
                      <div className={`text-sm font-semibold tabular-nums ${t.packetLoss < 1 ? "text-emerald-700" : t.packetLoss < 5 ? "text-amber-700" : "text-rose-700"}`}>
                        {t.packetLoss.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {chartData.length > 1 && (
                    <div className="h-20 -mx-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={lineColor}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Latency comparison chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Perbandingan Latency per Target</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Diperbarui {timeAgo(lastUpdated)}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-72 -ml-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={targets.flatMap((t) =>
                  t.samples.map((s, idx) => ({
                    sample: idx + 1,
                    [t.name]: s,
                  }))
                )}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.4} />
                <XAxis
                  dataKey="sample"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: "Ping #", position: "insideBottom", offset: -2, fontSize: 10, fill: "#9ca3af" }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: "ms", angle: -90, position: "insideLeft", fontSize: 10, fill: "#9ca3af" }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    fontSize: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                  formatter={(v: number) => [`${v.toFixed(1)} ms`, ""]}
                />
                <ReferenceLine y={50} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.3} />
                <ReferenceLine y={150} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.3} />
                {targets.map((t, i) => (
                  <Line
                    key={t.host}
                    type="monotone"
                    dataKey={t.name}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {targets.map((t, i) => (
              <div key={t.host} className="flex items-center gap-1.5 text-xs">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="font-medium">{t.name}</span>
                <span className="text-muted-foreground font-mono">{t.host}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const CHART_COLORS = ["#10b981", "#0ea5e9", "#f59e0b", "#8b5cf6", "#ec4899"];

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-lg bg-white/60 px-2.5 py-1.5">
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
      <div className="text-sm font-semibold tabular-nums">
        {value}
        {value !== "—" && <span className="text-[10px] text-muted-foreground ml-0.5">{unit}</span>}
      </div>
    </div>
  );
}
