import { NextResponse } from "next/server";
import { run } from "@/lib/network";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 20;

interface Device {
  ip: string;
  mac: string;
  iface: string;
  hostname?: string;
  vendor?: string;
  status: "online" | "unknown";
}

const VENDOR_PREFIXES: Record<string, string> = {
  "FA:FF": "Virtual (Hypervisor)",
  "EE:FF": "Cloud Gateway",
  "02:42": "Docker Container",
  "F8:1E": "Realtek",
  "DC:A6": "Raspberry Pi",
  "B8:27": "Raspberry Pi",
  "00:1A": "Intel Corp",
  "00:0C": "Cisco",
  "FC:FB": "Apple Inc.",
  "AC:DE": "Apple Inc.",
  "3C:22": "Apple Inc.",
  "B0:BE": "Apple Inc.",
  "00:25": "Apple Inc.",
  "F0:18": "Apple Inc.",
  "00:50": "Microsoft",
  "00:15": "Microsoft",
  "00:1D": "Dell Inc.",
  "00:14": "Dell Inc.",
  "FC:15": "Dell Inc.",
  "00:E0": "TP-Link",
  "50:C7": "TP-Link",
  "60:32": "TP-Link",
  "C0:4A": "TP-Link",
  "00:11": "Asus",
  "AC:22": "Asus",
  "04:D9": "Asus",
  "00:24": "Asus",
  "EC:08": "Samsung",
  "00:12": "Samsung",
  "00:15": "Samsung",
  "78:11": "Samsung",
  "00:16": "Microsoft",
  "00:1F": "Microsoft",
  "00:13": "Linksys",
  "00:14": "Linksys",
  "C0:3F": "Netgear",
  "00:1F": "Netgear",
  "00:1B": "Netgear",
  "9C:3D": "Netgear",
  "00:09": "Netgear",
  "00:1B": "Cisco-Linksys",
  "00:1A": "Cisco-Linksys",
  "00:18": "Cisco-Linksys",
  "00:06": "Cisco-Linksys",
  "00:14": "Cisco-Linksys",
  "00:1A": "Cisco-Linksys",
  "44:65": "Asus",
  "AC:84": "Asus",
  "08:60": "Asus",
  "10:7B": "Asus",
  "04:92": "Asus",
  "00:0E": "Asus",
};

function guessVendor(mac: string): string | undefined {
  if (!mac) return undefined;
  const prefix = mac.toUpperCase().split(":").slice(0, 2).join(":");
  // Try 3-byte prefix first (more specific)
  const prefix3 = mac.toUpperCase().split(":").slice(0, 3).join(":");
  return VENDOR_PREFIXES[prefix3] ?? VENDOR_PREFIXES[prefix] ?? "Tidak diketahui";
}

export async function GET() {
  try {
    // Try arping scan first to refresh ARP cache (best effort, may need root)
    // We'll just use `arp -a` (or `ip neigh`) since that doesn't need root
    const arpOut = await run("ip neigh show 2>/dev/null || arp -a 2>/dev/null", 5000);
    const devices: Device[] = [];

    // Try to get subnet for hostname hints
    const ipRoute = await run("ip route 2>/dev/null", 3000);

    for (const line of arpOut.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // Format from `ip neigh`:
      // "21.0.0.1 dev eth0 lladdr ee:ff:ff:ff:ff:ff REACHABLE"
      const m1 = trimmed.match(/^([\d.:a-fA-F]+)\s+dev\s+(\S+)\s+lladdr\s+([0-9a-fA-F:]+)(?:\s+(\S+))?/);
      if (m1) {
        const [, ip, iface, mac, state] = m1;
        devices.push({
          ip,
          mac,
          iface,
          status: state === "REACHABLE" || state === "STALE" ? "online" : "unknown",
          vendor: guessVendor(mac),
        });
        continue;
      }
      // Format from `arp -a`:
      // "? (21.0.0.1) at ee:ff:ff:ff:ff:ff [ether] PERM on eth0"
      const m2 = trimmed.match(/^\S*\s*\(([\d.]+)\)\s+at\s+([0-9a-fA-F:]+)\s+\[ether\]\s+\S+\s+on\s+(\S+)/);
      if (m2) {
        const [, ip, mac, iface] = m2;
        devices.push({
          ip,
          mac,
          iface,
          status: "online",
          vendor: guessVendor(mac),
        });
      }
    }

    // De-duplicate by IP
    const seen = new Set<string>();
    const unique = devices.filter((d) => {
      if (seen.has(d.ip)) return false;
      seen.add(d.ip);
      return true;
    });

    // Sort by IP numerically
    unique.sort((a, b) => {
      const an = a.ip
        .split(".")
        .map((x) => parseInt(x))
        .reduce((acc, v, i) => acc + v * Math.pow(256, 3 - i), 0);
      const bn = b.ip
        .split(".")
        .map((x) => parseInt(x))
        .reduce((acc, v, i) => acc + v * Math.pow(256, 3 - i), 0);
      return an - bn;
    });

    return NextResponse.json({
      ts: Date.now(),
      devices: unique,
      routes: ipRoute.split("\n").filter(Boolean).slice(0, 8),
      note:
        unique.length === 0
          ? "Tidak ada perangkat di cache ARP. Cache akan terisi seiring trafik jaringan — buka situs atau tunggu beberapa detik lalu refresh."
          : undefined,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "unknown", devices: [], ts: Date.now() },
      { status: 200 }
    );
  }
}
