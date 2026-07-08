import { NextResponse } from "next/server";
import { run } from "@/lib/network";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // Use ps with desired columns, sorted by CPU
    const cmd = `ps -eo pid,ppid,user,pcpu,pmem,rss,vsz,etime,comm,args --sort=-pcpu | head -n 31`;
    const out = await run(cmd, 5000);
    const lines = out.split("\n");

    const processes = lines.slice(1).map((line) => {
      // First 8 fields are fixed-width-ish, then comm, then args
      const trimmed = line.trim();
      if (!trimmed) return null;
      // Use regex to capture: pid ppid user pcpu pmem rss vsz etime comm rest
      const m = trimmed.match(/^(\d+)\s+(\d+)\s+(\S+)\s+([\d.]+)\s+([\d.]+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(\S+)\s*(.*)$/);
      if (!m) return null;
      const [, pid, ppid, user, pcpu, pmem, rss, vsz, etime, comm, args] = m;
      return {
        pid: parseInt(pid),
        ppid: parseInt(ppid),
        user,
        cpu: parseFloat(pcpu),
        mem: parseFloat(pmem),
        rssKB: parseInt(rss),
        vszKB: parseInt(vsz),
        etime,
        comm,
        args: (args || comm).trim(),
      };
    }).filter(Boolean) as any[];

    // Classify common heavy apps: Browser, Zoom, YouTube, AI tools
    const classify = (proc: any): string[] => {
      const tags: string[] = [];
      const name = (proc.comm + " " + proc.args).toLowerCase();
      if (/chrome|chromium|firefox|safari|edge|brave|opera/.test(name)) tags.push("Browser");
      if (/zoom/.test(name)) tags.push("Zoom");
      if (/youtube/.test(name)) tags.push("YouTube");
      if (/chatgpt|claude|gemini|copilot|perplexity|openai/.test(name)) tags.push("Web AI");
      if (/code|vscode|cursor|jetbrains|intellij/.test(name)) tags.push("IDE");
      if (/node|python|java|ruby|php/.test(name)) tags.push("Runtime");
      if (/docker|containerd/.test(name)) tags.push("Container");
      if (/nginx|apache|httpd|caddy/.test(name)) tags.push("Web Server");
      if (/postgres|mysql|redis|mongo/.test(name)) tags.push("Database");
      if (/ssh|sshd/.test(name)) tags.push("SSH");
      return tags;
    };

    processes.forEach((p) => {
      p.tags = classify(p);
    });

    // Aggregate by category (top tags by CPU)
    const tagAgg = new Map<string, { cpu: number; mem: number; count: number }>();
    processes.forEach((p) => {
      p.tags.forEach((t: string) => {
        const cur = tagAgg.get(t) ?? { cpu: 0, mem: 0, count: 0 };
        cur.cpu += p.cpu;
        cur.mem += p.mem;
        cur.count += 1;
        tagAgg.set(t, cur);
      });
    });

    const tagSummary = Array.from(tagAgg.entries())
      .map(([tag, v]) => ({ tag, ...v }))
      .sort((a, b) => b.cpu - a.cpu);

    // Memory info
    const meminfo = await run("cat /proc/meminfo 2>/dev/null", 2000);
    const mem: Record<string, number> = {};
    meminfo.split("\n").forEach((l) => {
      const m = l.match(/^(\w+):\s+(\d+)/);
      if (m) mem[m[1]] = parseInt(m[2]);
    });

    const totalMemKB = mem["MemTotal"] ?? 0;
    const availMemKB = mem["MemAvailable"] ?? 0;
    const usedMemKB = totalMemKB - availMemKB;
    const memUsagePercent =
      totalMemKB > 0 ? (usedMemKB / totalMemKB) * 100 : 0;

    return NextResponse.json({
      ts: Date.now(),
      processes,
      tagSummary,
      memory: {
        totalKB: totalMemKB,
        usedKB: usedMemKB,
        availKB: availMemKB,
        usagePercent: memUsagePercent,
        buffersKB: mem["Buffers"] ?? 0,
        cachedKB: mem["Cached"] ?? 0,
        swapTotalKB: mem["SwapTotal"] ?? 0,
        swapFreeKB: mem["SwapFree"] ?? 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "unknown", processes: [], ts: Date.now() },
      { status: 200 }
    );
  }
}
