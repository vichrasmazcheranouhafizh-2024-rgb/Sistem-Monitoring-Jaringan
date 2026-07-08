"use client";

import { usePolling } from "@/hooks/use-polling";
import { timeAgo } from "@/lib/format";
import { StatCard, SectionTitle } from "./shared";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wifi,
  Network,
  Globe,
  Router,
  Server,
  Cpu,
  Copy,
  Check,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

interface IfaceData {
  ts: number;
  hostname: string;
  interfaces: any[];
  gateway: string;
  gatewayIface: string;
  dnsServers: string[];
  routes: string[];
}

export function InterfaceView() {
  const { data, lastUpdated } = usePolling<IfaceData>("/api/metrics/interface", {
    intervalMs: 15000,
  });

  const ifaces = data?.interfaces ?? [];
  const primary = ifaces[0];

  const connectionTypeLabel = (t: string) => {
    switch (t) {
      case "Ethernet":
        return { label: "Kabel (Ethernet)", color: "emerald", icon: Network };
      case "Wi-Fi":
        return { label: "Wi-Fi", color: "sky", icon: Wifi };
      case "PPP / Seluler":
        return { label: "Seluler (4G/5G)", color: "violet", icon: Wifi };
      case "USB Tether":
        return { label: "USB Tethering", color: "amber", icon: Network };
      default:
        return { label: t, color: "teal", icon: Network };
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Network Interface"
        description="Identifikasi jenis koneksi (Wi-Fi, Ethernet, 4G/5G) serta informasi IP, MAC, Gateway, dan DNS."
        icon={Wifi}
      />

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Hostname"
          value={data?.hostname ?? "—"}
          icon={Server}
          accent="teal"
          subtitle="Nama host sistem"
        />
        <StatCard
          title="Gateway Default"
          value={data?.gateway ?? "—"}
          icon={Router}
          accent="emerald"
          subtitle={data?.gatewayIface ? `via ${data.gatewayIface}` : undefined}
        />
        <StatCard
          title="DNS Servers"
          value={data?.dnsServers?.length ?? 0}
          unit="server"
          icon={Globe}
          accent="sky"
          subtitle={data?.dnsServers?.[0] ?? "—"}
        />
        <StatCard
          title="Jumlah Interface"
          value={ifaces.length}
          icon={Network}
          accent="violet"
          subtitle="Aktif terpasang"
          delay={0.05}
        />
      </div>

      {/* Primary Interface Card */}
      {primary && (
        <Card className="bg-gradient-to-br from-emerald-50 via-teal-50/40 to-sky-50/30 border-emerald-200/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                  {(() => {
                    const Icon = connectionTypeLabel(primary.type).icon;
                    return <Icon className="size-5.5" strokeWidth={2.4} />;
                  })()}
                </div>
                <div>
                  <h3 className="text-base font-semibold">Interface Aktif: {primary.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {connectionTypeLabel(primary.type).label} · {primary.state} · MTU {primary.mtu}
                  </p>
                </div>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                {primary.state === "UP" ? "🟢 Aktif" : "🔴 Nonaktif"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <InfoTile label="IPv4 Address" value={primary.ipv4 || "—"} copyable />
              <InfoTile label="IPv6 Address" value={primary.ipv6 || "—"} copyable />
              <InfoTile label="MAC Address" value={primary.mac || "—"} copyable mono />
              <InfoTile label="MTU" value={`${primary.mtu}`} mono />
            </div>
          </CardContent>
        </Card>
      )}

      {/* All interfaces table */}
      <Card>
        <CardHeader className="pb-2">
          <h3 className="text-base font-semibold">Daftar Interface</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Diperbarui {timeAgo(lastUpdated)} · {ifaces.length} interface
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ifaces.map((iface, i) => {
              const meta = connectionTypeLabel(iface.type);
              const Icon = meta.icon;
              return (
                <motion.div
                  key={iface.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border/60 bg-card p-4 hover:shadow-md hover:border-border transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-9 rounded-lg bg-muted/60 flex items-center justify-center text-foreground shrink-0">
                        <Icon className="size-4.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-mono font-semibold text-sm truncate">{iface.name}</h4>
                        <p className="text-[11px] text-muted-foreground">{meta.label}</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        iface.state === "UP"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {iface.state}
                    </Badge>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <Row label="IPv4" value={iface.ipv4 || "—"} mono />
                    <Row label="IPv6" value={iface.ipv6 || "—"} mono />
                    <Row label="MAC" value={iface.mac || "—"} mono />
                    <Row label="MTU" value={`${iface.mtu}`} mono />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Gateway & DNS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Router className="size-4.5 text-emerald-600" />
              Gateway & Routing
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Default gateway dan routing table utama
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50/40 border border-emerald-200/60 p-4">
              <div className="text-[11px] text-emerald-700 uppercase font-medium">Default Gateway</div>
              <div className="text-lg font-mono font-semibold text-emerald-900 mt-0.5">
                {data?.gateway ?? "—"}
              </div>
              {data?.gatewayIface && (
                <div className="text-xs text-emerald-700/80 mt-0.5">
                  via interface <span className="font-mono font-semibold">{data.gatewayIface}</span>
                </div>
              )}
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground uppercase font-medium mb-2">
                Routing Table (Top {Math.min(8, data?.routes?.length ?? 0)})
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 max-h-48 overflow-y-auto">
                <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap">
                  {(data?.routes ?? []).join("\n") || "—"}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Globe className="size-4.5 text-sky-600" />
              Konfigurasi DNS
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Nameserver yang digunakan sistem (dari /etc/resolv.conf)
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.dnsServers ?? []).length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Tidak ada DNS server terkonfigurasi
              </div>
            )}
            {(data?.dnsServers ?? []).map((dns, i) => (
              <motion.div
                key={dns}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-sky-50 to-cyan-50/30 border border-sky-200/60"
              >
                <div className="size-9 rounded-lg bg-white/80 flex items-center justify-center text-sky-600 shrink-0">
                  <Globe className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-sky-700 uppercase font-medium">
                    DNS {i === 0 ? "Primer" : i === 1 ? "Sekunder" : `#${i + 1}`}
                  </div>
                  <div className="text-sm font-mono font-semibold text-sky-900">{dns}</div>
                </div>
                <Copyable text={dns} />
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium truncate ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function InfoTile({ label, value, copyable, mono }: { label: string; value: string; copyable?: boolean; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-white/70 backdrop-blur-sm border border-white/60 p-3">
      <div className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">{label}</div>
      <div className={`text-sm font-semibold mt-1 break-all ${mono ? "font-mono" : ""}`}>{value}</div>
      {copyable && value !== "—" && <Copyable text={value} />}
    </div>
  );
}

function Copyable({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? (
        <>
          <Check className="size-3 text-emerald-600" />
          <span className="text-emerald-600">Tersalin</span>
        </>
      ) : (
        <>
          <Copy className="size-3" />
          Salin
        </>
      )}
    </button>
  );
}
