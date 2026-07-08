import { exec } from "child_process";
import { promisify } from "util";
import { readFile } from "fs/promises";

const execAsync = promisify(exec);

export async function run(cmd: string, timeoutMs = 8000): Promise<string> {
  try {
    const { stdout } = await execAsync(cmd, {
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024 * 4,
    });
    return stdout.trim();
  } catch (err: any) {
    // Return stderr if available so we can debug
    if (err?.stderr) return err.stderr.trim();
    return "";
  }
}

export async function readFileSafe(path: string): Promise<string> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return "";
  }
}

// Parse /proc/net/dev into per-interface rx/tx byte counters
export interface NetDevCounter {
  name: string;
  rxBytes: number;
  txBytes: number;
  rxPackets: number;
  txPackets: number;
  rxErrors: number;
  txErrors: number;
  rxDrops: number;
  txDrops: number;
}

export function parseNetDev(content: string): NetDevCounter[] {
  const lines = content.split("\n").filter(Boolean);
  const result: NetDevCounter[] = [];
  // first two lines are headers
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (!match) continue;
    const name = match[1].trim();
    const parts = match[2].trim().split(/\s+/).map(Number);
    if (parts.length < 16) continue;
    result.push({
      name,
      rxBytes: parts[0],
      rxPackets: parts[1],
      rxErrors: parts[2],
      rxDrops: parts[3],
      txBytes: parts[8],
      txPackets: parts[9],
      txErrors: parts[10],
      txDrops: parts[11],
    });
  }
  return result;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSec: number, decimals = 1): string {
  return `${formatBytes(bytesPerSec, decimals)}/s`;
}

export function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
