export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.min(
    Math.floor(Math.log(Math.abs(bytes)) / Math.log(k)),
    sizes.length - 1
  );
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSec: number, decimals = 1): string {
  if (!bytesPerSec || bytesPerSec < 0) return "0 B/s";
  return `${formatBytes(bytesPerSec, decimals)}/s`;
}

export function formatNumber(n: number, decimals = 0): string {
  return (n ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "0s";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}h ${h}j ${m}m`;
  if (h > 0) return `${h}j ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatUptime(seconds: number): string {
  if (!seconds || seconds < 0) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d} hari ${h} jam`;
  if (h > 0) return `${h} jam ${m} menit`;
  return `${m} menit`;
}

export function timeAgo(ts: number | null): string {
  if (!ts) return "belum pernah";
  const diff = Math.max(0, Date.now() - ts);
  const s = Math.floor(diff / 1000);
  if (s < 5) return "baru saja";
  if (s < 60) return `${s} dtk lalu`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} mnt lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hr lalu`;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// Health score: weighted from several metrics
export function computeHealthScore(input: {
  packetLoss: number; // 0..100
  avgLatency: number; // ms
  jitter: number; // ms
  cpuUsage: number; // 0..100
  memUsage: number; // 0..100
  bandwidthUtil: number; // 0..100
}): { score: number; label: string; color: string } {
  // Lower is better for loss/latency/jitter/cpu/mem
  const lossPenalty = Math.min(40, input.packetLoss * 4); // up to -40
  const latencyPenalty = Math.min(20, (input.avgLatency / 100) * 20); // 100ms → -20
  const jitterPenalty = Math.min(10, (input.jitter / 50) * 10);
  const cpuPenalty = Math.min(15, (input.cpuUsage / 100) * 15);
  const memPenalty = Math.min(15, (input.memUsage / 100) * 15);
  const bwPenalty = Math.min(10, Math.max(0, (input.bandwidthUtil - 80) / 20) * 10);

  const score = Math.round(
    Math.max(
      0,
      100 - lossPenalty - latencyPenalty - jitterPenalty - cpuPenalty - memPenalty - bwPenalty
    )
  );

  let label = "Sangat Baik";
  let color = "emerald";
  if (score < 50) {
    label = "Buruk";
    color = "rose";
  } else if (score < 70) {
    label = "Cukup";
    color = "amber";
  } else if (score < 85) {
    label = "Baik";
    color = "sky";
  }
  return { score, label, color };
}
