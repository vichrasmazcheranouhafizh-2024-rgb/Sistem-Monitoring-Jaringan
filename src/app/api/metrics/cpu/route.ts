import { NextResponse } from "next/server";
import { readFileSafe } from "@/lib/network";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface CoreSample {
  total: number;
  idle: number;
}
interface Snapshot {
  ts: number;
  cores: CoreSample[];
  agg: CoreSample;
}

let prev: Snapshot | null = null;

export async function GET() {
  try {
    const stat = await readFileSafe("/proc/stat");
    const lines = stat.split("\n");

    const cpuAgg = lines.find((l) => /^cpu\s+/.test(l));
    const cpuLines = lines.filter((l) => /^cpu\d+/.test(l));

    const parseLine = (line: string): CoreSample => {
      const parts = line.trim().split(/\s+/);
      const values = parts.slice(1).map(Number);
      const idle = values[3] + (values[4] || 0); // idle + iowait
      const total = values.reduce((a, b) => a + b, 0);
      return { total, idle };
    };

    const agg = parseLine(cpuAgg ?? "cpu 0 0 0 0");
    const cores = cpuLines.map((l) => parseLine(l));

    const now = Date.now();
    let overallUsage = 0;
    let perCoreUsage: { name: string; usage: number }[] = [];

    if (prev) {
      const dtAgg = agg.total - prev.agg.total;
      const diAgg = agg.idle - prev.agg.idle;
      overallUsage =
        dtAgg > 0 ? Math.max(0, Math.min(100, ((dtAgg - diAgg) / dtAgg) * 100)) : 0;

      perCoreUsage = cores.map((c, i) => {
        const p = prev!.cores[i];
        if (!p) return { name: `cpu${i}`, usage: 0 };
        const dt = c.total - p.total;
        const di = c.idle - p.idle;
        const usage = dt > 0 ? Math.max(0, Math.min(100, ((dt - di) / dt) * 100)) : 0;
        return { name: `cpu${i}`, usage };
      });
    } else {
      perCoreUsage = cores.map((_, i) => ({ name: `cpu${i}`, usage: 0 }));
    }

    prev = { ts: now, cores, agg };

    // loadavg
    const loadavgRaw = await readFileSafe("/proc/loadavg");
    const loadParts = loadavgRaw.split(/\s+/);
    const loadavg = {
      "1m": parseFloat(loadParts[0]) || 0,
      "5m": parseFloat(loadParts[1]) || 0,
      "15m": parseFloat(loadParts[2]) || 0,
      running: loadParts[3] || "0/0",
    };

    // uptime
    const uptimeRaw = await readFileSafe("/proc/uptime");
    const uptimeSec = parseFloat(uptimeRaw.split(" ")[0]) || 0;

    return NextResponse.json({
      ts: now,
      coreCount: cores.length,
      overallUsage,
      perCore: perCoreUsage,
      loadavg,
      uptimeSec,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "unknown", perCore: [], overallUsage: 0, ts: Date.now() },
      { status: 200 }
    );
  }
}
