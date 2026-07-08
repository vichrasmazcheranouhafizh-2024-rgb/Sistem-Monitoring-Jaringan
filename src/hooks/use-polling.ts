"use client";

import { useEffect, useState, useRef, useCallback } from "react";

interface FetchOptions {
  intervalMs?: number;
  enabled?: boolean;
}

export function usePolling<T>(
  url: string,
  options: FetchOptions = {}
): {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  lastUpdated: number | null;
} {
  const { intervalMs, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await fetch(url, {
        signal: ac.signal,
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
      setLastUpdated(Date.now());
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setError(e?.message ?? "fetch error");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (!enabled) return;
    fetchData();
    if (!intervalMs) return;
    const id = setInterval(fetchData, intervalMs);
    return () => {
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [fetchData, intervalMs, enabled]);

  return { data, loading, error, refetch: fetchData, lastUpdated };
}
