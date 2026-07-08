import { NextResponse } from "next/server";
import { readFileSafe, parseNetDev, run } from "@/lib/network";

interface Snapshot {
  ts: number;
  rxBytes: number;
  txBytes: number;
}

const HISTORY_LIMIT = 60;
const historyMap = new Map<string, Snapshot[]>();

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const content = await readFileSafe("/proc/net/dev");
    const counters = parseNetDev(content);
    const now = Date.now();

    const realIfaces = counters.filter(
      (c) =>
        c.name !== "lo" &&
        !c.name.startsWith("dummy") &&
        !c.name.startsWith("docker") &&
        !c.name.startsWith("br-") &&
        !c.name.startsWith("veth")
    );

    const perIface = realIfaces.map((iface) => {
      const history = historyMap.get(iface.name) ?? [];
      const prev = history[history.length - 1];
      const dtSec = prev ? (now - prev.ts) / 1000 : 0;

      const downloadBps =
        prev && dtSec > 0 ? Math.max(0, (iface.rxBytes - prev.rxBytes) / dtSec) : 0;
      const uploadBps =
        prev && dtSec > 0 ? Math.max(0, (iface.txBytes - prev.txBytes) / dtSec) : 0;

      const newHistory = [
        ...history,
        { ts: now, rxBytes: iface.rxBytes, txBytes: iface.txBytes },
      ].slice(-HISTORY_LIMIT);
      historyMap.set(iface.name, newHistory);

      const series = newHistory.slice(1).map((cur, i) => {
        const last = newHistory[i];
        const d = (cur.ts - last.ts) / 1000;
        return {
          ts: cur.ts,
          download: d > 0 ? (cur.rxBytes - last.rxBytes) / d : 0,
          upload: d > 0 ? (cur.txBytes - last.txBytes) / d : 0,
        };
      });

      const peakDown = series.reduce((m, s) => Math.max(m, s.download), 0);
      const peakUp = series.reduce((m, s) => Math.max(m, s.upload), 0);
      const avgDown = series.length
        ? series.reduce((a, s) => a + s.download, 0) / series.length
        : 0;
      const avgUp = series.length
        ? series.reduce((a, s) => a + s.upload, 0) / series.length
        : 0;

      return {
        name: iface.name,
        rxBytes: iface.rxBytes,
        txBytes: iface.txBytes,
        rxPackets: iface.rxPackets,
        txPackets: iface.txPackets,
        rxErrors: iface.rxErrors,
        txErrors: iface.txErrors,
        rxDrops: iface.rxDrops,
        txDrops: iface.txDrops,
        downloadBps: Math.round(downloadBps),
        uploadBps: Math.round(uploadBps),
        peakDownBps: Math.round(peakDown),
        peakUpBps: Math.round(peakUp),
        avgDownBps: Math.round(avgDown),
        avgUpBps: Math.round(avgUp),
        series: series.slice(-60),
      };
    });

    return NextResponse.json({
      ts: now,
      interfaces: perIface,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "unknown", interfaces: [], ts: Date.now() },
      { status: 200 }
    );
  }
}

export const _run = run;
