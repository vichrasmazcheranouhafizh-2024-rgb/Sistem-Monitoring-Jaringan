"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: LucideIcon;
  trend?: string;
  trendUp?: boolean | null; // null = neutral
  accent?: "emerald" | "sky" | "amber" | "rose" | "violet" | "teal";
  subtitle?: string;
  delay?: number;
}

const ACCENTS: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: "from-emerald-500/10 to-teal-500/5", text: "text-emerald-600", border: "border-emerald-500/20" },
  sky: { bg: "from-sky-500/10 to-cyan-500/5", text: "text-sky-600", border: "border-sky-500/20" },
  amber: { bg: "from-amber-500/10 to-orange-500/5", text: "text-amber-600", border: "border-amber-500/20" },
  rose: { bg: "from-rose-500/10 to-red-500/5", text: "text-rose-600", border: "border-rose-500/20" },
  violet: { bg: "from-violet-500/10 to-purple-500/5", text: "text-violet-600", border: "border-violet-500/20" },
  teal: { bg: "from-teal-500/10 to-emerald-500/5", text: "text-teal-600", border: "border-teal-500/20" },
};

export function StatCard({
  title,
  value,
  unit,
  icon: Icon,
  trend,
  trendUp,
  accent = "emerald",
  subtitle,
  delay = 0,
}: StatCardProps) {
  const a = ACCENTS[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      whileHover={{ y: -2 }}
    >
      <Card className={cn("relative overflow-hidden bg-gradient-to-br border", a.bg, a.border)}>
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            {Icon && (
              <div className={cn("size-8 rounded-lg bg-white/70 flex items-center justify-center", a.text)}>
                <Icon className="size-4" strokeWidth={2.4} />
              </div>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground tabular-nums">
              {value}
            </span>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          {trend && (
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              <span
                className={cn(
                  "font-medium",
                  trendUp === true && "text-emerald-600",
                  trendUp === false && "text-rose-600",
                  trendUp === null && "text-muted-foreground"
                )}
              >
                {trend}
              </span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

export function SectionTitle({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="size-9 rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/5 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0">
            <Icon className="size-4.5" strokeWidth={2.3} />
          </div>
        )}
        <div>
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">{description}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

export function LiveDot({ label = "Live" }: { label?: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200/60 rounded-full px-2.5 py-1">
      <span className="relative flex size-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
        <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
      </span>
      {label}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="size-14 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
        <Icon className="size-7" />
      </div>
      <h3 className="text-sm font-medium">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</p>
      )}
    </div>
  );
}
