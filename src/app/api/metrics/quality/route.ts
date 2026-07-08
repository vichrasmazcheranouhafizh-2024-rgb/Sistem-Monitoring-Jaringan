import { NextResponse } from "next/server";
import { run } from "@/lib/network";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 25;

const TARGETS = [
  { name: "Gateway", host: "21.0.0.1", location: "Lokal" },
  { name: "DNS Primer", host: "100.100.2.136", location: "Lokal" },
  { name: "Google DNS", host: "8.8.8.8", location: "Global" },
  { name: "Cloudflare", host: "1.1.1.1", location: "Global" },
];

interface PingResult {
  name: string;
  host: string;
  location: string;
  rttAvg: number | null;
  rttMin: number | null;
  rttMax: number | null;
  mdev: number | null; // jitter (mean deviation)
  packetLoss: number; // percent
  samples: number[];
  error?: string;
}

async function pingTarget(host: string): Promise<PingResult> {
  // 5 quick pings
  const out = await run(`ping -c 5 -i 0.2 -W 1 ${host}`, 12000);
  if (!out) {
    return {
      name: "",
      host,
      location: "",
      rttAvg: null,
      rttMin: null,
      rttMax: null,
      mdev: null,
      packetLoss: 100,
      samples: [],
      error: "ping failed",
    };
  }
  // Parse "X packets transmitted, Y received, Z% packet loss"
  const lossMatch = out.match(/(\d+) packets transmitted,\s*(\d+) received,?\s*([\d.]+)% packet loss/);
  const packetLoss = lossMatch ? parseFloat(lossMatch[3]) : 0;

  // Parse "rtt min/avg/max/mdev = X/Y/Z/W ms"
  const rttMatch = out.match(
    /rtt min\/avg\/max\/(?:mdev|stddev)\s*=\s*([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+)\s*ms/
  );

  // Parse individual "time=X ms" lines
  const samples: number[] = [];
  const timeRegex = /time=([\d.]+)\s*ms/g;
  let m;
  while ((m = timeRegex.exec(out)) !== null) {
    samples.push(parseFloat(m[1]));
  }

  return {
    name: "",
    host,
    location: "",
    rttMin: rttMatch ? parseFloat(rttMatch[1]) : null,
    rttAvg: rttMatch ? parseFloat(rttMatch[2]) : null,
    rttMax: rttMatch ? parseFloat(rttMatch[3]) : null,
    mdev: rttMatch ? parseFloat(rttMatch[4]) : null,
    packetLoss,
    samples,
  };
}

export async function GET() {
  const results = await Promise.all(
    TARGETS.map(async (t) => {
      const r = await pingTarget(t.host);
      return { ...r, name: t.name, location: t.location };
    })
  );

  return NextResponse.json({
    ts: Date.now(),
    targets: results,
  });
}
