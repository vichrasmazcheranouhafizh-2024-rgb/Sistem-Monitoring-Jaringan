import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NetPulse — Network Monitoring & Management Tool",
  description:
    "NetPulse adalah aplikasi monitoring jaringan real-time: bandwidth, kualitas koneksi, interface, device scanner, proses, dan rekomendasi AI.",
  keywords: [
    "NetPulse",
    "Network Monitoring",
    "Bandwidth",
    "Ping",
    "Device Scanner",
    "Network Management",
  ],
  authors: [{ name: "NetPulse Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
