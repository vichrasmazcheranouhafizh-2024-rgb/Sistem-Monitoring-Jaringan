import { NextResponse } from "next/server";
import { run, readFileSafe } from "@/lib/network";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const ipAddr = await run("ip -o addr show 2>/dev/null", 4000);
    const ipLink = await run("ip -o link show 2>/dev/null", 4000);
    const ipRoute = await run("ip route 2>/dev/null", 4000);
    const resolv = await readFileSafe("/etc/resolv.conf");
    const hostname = await run("hostname 2>/dev/null", 2000);

    // Parse interfaces
    const interfaces: any[] = [];
    const ifaceNames = new Set<string>();

    // From `ip -o addr` lines like:
    // "2: eth0    inet 21.0.12.8/32 scope global eth0"
    for (const line of ipAddr.split("\n")) {
      const m = line.match(/^(\d+):\s+(\S+)\s+(inet6?)\s+([^\s]+)\s+(.*)$/);
      if (!m) continue;
      const [, idx, name, family, addrCidr] = m;
      if (name === "lo") continue;
      ifaceNames.add(name);
      let entry = interfaces.find((i) => i.name === name);
      if (!entry) {
        entry = {
          name,
          index: parseInt(idx),
          ipv4: "",
          ipv6: "",
          mac: "",
          state: "",
          mtu: 0,
          type: "Unknown",
          family: [],
        };
        interfaces.push(entry);
      }
      const addr = addrCidr.split("/")[0];
      if (family === "inet") entry.ipv4 = addr;
      else if (family === "inet6" && !addr.startsWith("fe80")) entry.ipv6 = addr;
    }

    // From `ip -o link` lines like:
    // "2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1450 qdisc pfifo state UP mode DEFAULT group default qlen 1000\    link/ether fa:ad:35:3d:dc:93 brd ff:ff:ff:ff:ff:ff"
    for (const line of ipLink.split("\n")) {
      const m = line.match(/^(\d+):\s+([^:@]+)[:@]?\s+<([^>]*)>\s+(.*)$/);
      if (!m) continue;
      const name = m[2].trim();
      const flags = m[3];
      const rest = m[4];
      let entry = interfaces.find((i) => i.name === name);
      if (!entry) {
        entry = {
          name,
          index: parseInt(m[1]),
          ipv4: "",
          ipv6: "",
          mac: "",
          state: "",
          mtu: 0,
          type: "Unknown",
          family: [],
        };
        interfaces.push(entry);
      }
      const macMatch = rest.match(/link\/ether\s+([0-9a-f:]+)/i);
      if (macMatch) entry.mac = macMatch[1];
      const stateMatch = rest.match(/state\s+(\S+)/);
      if (stateMatch) entry.state = stateMatch[1];
      const mtuMatch = rest.match(/mtu\s+(\d+)/);
      if (mtuMatch) entry.mtu = parseInt(mtuMatch[1]);

      entry.flags = flags.split(",");
      // Guess type
      if (flags.includes("LOOPBACK")) entry.type = "Loopback";
      else if (name.startsWith("eth") || name.startsWith("en")) entry.type = "Ethernet";
      else if (name.startsWith("wl") || name.startsWith("wlan")) entry.type = "Wi-Fi";
      else if (name.startsWith("ppp")) entry.type = "PPP / Seluler";
      else if (name.startsWith("usb")) entry.type = "USB Tether";
      else entry.type = "Virtual / Lainnya";
    }

    // Filter out virtual interfaces for the main view but keep them in the list
    const visibleInterfaces = interfaces.filter(
      (i) =>
        !i.name.startsWith("docker") &&
        !i.name.startsWith("br-") &&
        !i.name.startsWith("veth") &&
        !i.name.startsWith("dummy")
    );

    // Parse default gateway
    let gateway = "";
    let gatewayIface = "";
    const defaultRoute = ipRoute.split("\n").find((l) => l.startsWith("default"));
    if (defaultRoute) {
      const m = defaultRoute.match(/via\s+([\d.:a-fA-F]+)\s+dev\s+(\S+)/);
      if (m) {
        gateway = m[1];
        gatewayIface = m[2];
      }
    }

    // Parse DNS
    const dnsServers = resolv
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("nameserver"))
      .map((l) => l.split(/\s+/)[1])
      .filter(Boolean);

    return NextResponse.json({
      ts: Date.now(),
      hostname,
      interfaces: visibleInterfaces,
      allInterfaces: interfaces,
      gateway,
      gatewayIface,
      dnsServers,
      routes: ipRoute.split("\n").filter(Boolean).slice(0, 10),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "unknown", interfaces: [], ts: Date.now() },
      { status: 200 }
    );
  }
}
