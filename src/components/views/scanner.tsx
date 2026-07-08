"use client";

import { usePolling } from "@/hooks/use-polling";
import { timeAgo } from "@/lib/format";
import { StatCard, SectionTitle, EmptyState } from "./shared";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ScanLine,
  Users,
  Network,
  RefreshCw,
  Laptop,
  Smartphone,
  Server,
  Router,
  Cpu,
  HelpCircle,
} from "lucide-react";
import { motion } from "framer-motion";

interface Device {
  ip: string;
  mac: string;
  iface: string;
  vendor?: string;
  status: "online" | "unknown";
}

interface DevicesData {
  ts: number;
  devices: Device[];
  routes: string[];
  note?: string;
}

function deviceIcon(vendor?: string) {
  if (!vendor) return HelpCircle;
  const v = vendor.toLowerCase();
  if (v.includes("raspberry")) return Cpu;
  if (v.includes("apple") || v.includes("samsung")) return Smartphone;
  if (v.includes("dell") || v.includes("intel") || v.includes("asus")) return Laptop;
  if (v.includes("cisco") || v.includes("netgear") || v.includes("tp-link") || v.includes("linksys")) return Router;
  if (v.includes("docker")) return Server;
  return Server;
}

export function Scanner() {
  const { data, lastUpdated, refetch, loading } = usePolling<DevicesData>(
    "/api/metrics/devices",
    { intervalMs: 15000 }
  );

  const devices = data?.devices ?? [];
  const onlineCount = devices.filter((d) => d.status === "online").length;
  const uniqueVendors = new Set(devices.map((d) => d.vendor).filter(Boolean)).size;

  // Try to detect subnet
  const subnet = (() => {
    const r = data?.routes?.find((l) => l.includes("/")) ?? "";
    const m = r.match(/([\d.]+\/\d+)/);
    return m ? m[1] : "—";
  })();

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Device Scanner"
        description="Memindai perangkat lain yang terhubung dalam satu jaringan yang sama (IP & MAC Discovery) menggunakan ARP cache."
        icon={ScanLine}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
            className="h-8 gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Scan Ulang
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Perangkat Ditemukan"
          value={devices.length}
          icon={Users}
          accent="emerald"
          subtitle={`${onlineCount} online`}
        />
        <StatCard
          title="Status Online"
          value={onlineCount}
          icon={Network}
          accent="sky"
          subtitle="Terkonfirmasi ARP"
        />
        <StatCard
          title="Vendor Unik"
          value={uniqueVendors}
          icon={Cpu}
          accent="violet"
          subtitle="Merek perangkat"
          delay={0.05}
        />
        <StatCard
          title="Subnet Dipindai"
          value={subnet}
          icon={Network}
          accent="teal"
          subtitle="Berdasarkan route"
          delay={0.1}
        />
      </div>

      {/* Note if empty */}
      {devices.length === 0 && (
        <Card>
          <CardContent className="py-2">
            <EmptyState
              icon={ScanLine}
              title="Belum ada perangkat di cache ARP"
              description={
                data?.note ??
                "Cache ARP akan terisi otomatis seiring trafik jaringan. Coba ping beberapa host atau buka situs, lalu klik Scan Ulang."
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Devices grid */}
      {devices.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">Daftar Perangkat Ditemukan</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Diperbarui {timeAgo(lastUpdated)} · Klik Salin MAC untuk menyalin
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {devices.map((d, i) => {
                const Icon = deviceIcon(d.vendor);
                return (
                  <motion.div
                    key={`${d.ip}-${d.mac}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-xl border border-border/60 bg-gradient-to-br from-card to-muted/20 p-4 hover:shadow-md hover:border-emerald-200/60 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="size-10 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-105 transition-transform">
                          <Icon className="size-5" strokeWidth={2.2} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-mono font-semibold truncate">{d.ip}</div>
                          <div className="text-[11px] text-muted-foreground">
                            via {d.iface}
                          </div>
                        </div>
                      </div>
                      <Badge
                        className={
                          d.status === "online"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                            : "bg-muted text-muted-foreground hover:bg-muted"
                        }
                      >
                        {d.status === "online" ? "● Online" : "? Unknown"}
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">MAC Address</span>
                        <span className="font-mono font-medium">{d.mac}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Vendor (perkiraan)</span>
                        <span className="font-medium truncate ml-2">{d.vendor ?? "—"}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info card */}
      <Card className="bg-gradient-to-br from-sky-50 to-cyan-50/40 border-sky-200/60">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-lg bg-sky-100 flex items-center justify-center shrink-0">
              <Network className="size-4.5 text-sky-600" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-sky-900">Cara Kerja Scanner</h4>
              <p className="text-xs text-sky-800/80 mt-1 leading-relaxed">
                Scanner menggunakan cache ARP (<code className="font-mono text-[10px] bg-white/60 px-1 rounded">ip neigh</code> /
                <code className="font-mono text-[10px] bg-white/60 px-1 rounded ml-1">arp -a</code>) untuk menampilkan perangkat
                yang pernah berkomunikasi dengan host ini. Untuk hasil yang lebih lengkap, gunakan
                <code className="font-mono text-[10px] bg-white/60 px-1 rounded ml-1">nmap -sn &lt;subnet&gt;</code> di
                server (memerlukan root). Vendor diidentifikasi dari OUI (Organizationally Unique Identifier) pada 3 byte pertama MAC address.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
