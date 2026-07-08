"use client";

import { useState, useCallback } from "react";
import { SectionTitle } from "./shared";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Send,
  RefreshCw,
  Bot,
  User,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

export function AIInsights() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchMetrics = async () => {
    const endpoints = [
      "/api/metrics/bandwidth",
      "/api/metrics/quality",
      "/api/metrics/cpu",
      "/api/metrics/processes",
      "/api/metrics/interface",
    ];
    const results = await Promise.all(
      endpoints.map(async (url) => {
        try {
          const r = await fetch(url, { cache: "no-store" });
          return r.ok ? await r.json() : null;
        } catch {
          return null;
        }
      })
    );
    return {
      bandwidth: results[0],
      quality: results[1],
      cpu: results[2],
      processes: results[3],
      interface: results[4],
    };
  };

  const generateInsights = useCallback(async () => {
    setLoading(true);
    try {
      const metrics = await fetchMetrics();
      const res = await fetch("/api/ai/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metrics }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.content,
          ts: Date.now(),
        },
      ]);
    } catch (e: any) {
      toast({
        title: "Gagal",
        description: e?.message ?? "Tidak dapat menghubungi layanan AI.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const askQuestion = useCallback(async () => {
    if (!question.trim() || loading) return;
    const q = question.trim();
    setQuestion("");
    setMessages((m) => [...m, { role: "user", content: q, ts: Date.now() }]);
    setLoading(true);
    try {
      const metrics = await fetchMetrics();
      const res = await fetch("/api/ai/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metrics, question: q }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", content: data.content, ts: Date.now() },
      ]);
    } catch (e: any) {
      toast({
        title: "Gagal",
        description: e?.message ?? "Tidak dapat menghubungi layanan AI.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [question, loading, toast]);

  const quickQuestions = [
    "Apakah jaringan saya sehat saat ini?",
    "Proses apa yang paling membebani CPU?",
    "Bagaimana cara mengurangi latency?",
    "Apakah ada masalah dengan bandwidth?",
  ];

  return (
    <div className="space-y-6">
      <SectionTitle
        title="AI Insights & Rekomendasi"
        description="Analisis cerdas berbasis AI terhadap kondisi jaringan dan sistem Anda. Klik tombol di bawah untuk mendapatkan rekomendasi otomatis, atau ajukan pertanyaan spesifik."
        icon={Sparkles}
        action={
          <Button
            onClick={generateInsights}
            disabled={loading}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/30"
          >
            {loading ? (
              <RefreshCw className="size-4 animate-spin mr-1.5" />
            ) : (
              <Sparkles className="size-4 mr-1.5" />
            )}
            {messages.length === 0 ? "Generate Analisis AI" : "Refresh Analisis"}
          </Button>
        }
      />

      {/* Feature cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <FeatureCard
          icon={Lightbulb}
          title="Analisis Otomatis"
          desc="AI mengumpulkan semua metrik jaringan dan sistem, lalu memberikan ringkasan kesehatan serta area yang perlu diperhatikan."
          color="amber"
        />
        <FeatureCard
          icon={TrendingUp}
          title="Rekomendasi Actionable"
          desc="Bukan sekadar diagnosis — AI memberikan langkah konkret untuk meningkatkan performa jaringan dan CPU Anda."
          color="emerald"
        />
        <FeatureCard
          icon={ShieldCheck}
          title="Tanya Jawab Bebas"
          desc="Ajukan pertanyaan spesifik dalam bahasa Indonesia: 'Kenapa internet lambat?', 'Apakah RAM cukup?', dan lainnya."
          color="sky"
        />
      </div>

      {/* Chat / Insights display */}
      <Card className="bg-gradient-to-br from-card to-muted/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Bot className="size-4.5 text-emerald-600" />
              NetPulse AI Assistant
            </h3>
            {messages.length > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {messages.length} pesan
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="relative mb-4">
                <div className="size-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white shadow-xl shadow-emerald-500/30">
                  <Bot className="size-8" strokeWidth={2} />
                </div>
                <Sparkles className="absolute -top-1 -right-1 size-5 text-amber-400 fill-amber-300" />
              </div>
              <h4 className="text-base font-semibold">NetPulse AI Siap Membantu</h4>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                Klik <strong>Generate Analisis AI</strong> untuk mendapatkan insight otomatis,
                atau ketik pertanyaan Anda di bawah.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-5 w-full max-w-xl">
                {quickQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuestion(q)}
                    className="text-left text-xs rounded-lg border border-border/60 bg-card hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors p-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}
                  >
                    {m.role === "assistant" && (
                      <div className="size-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-emerald-500/20">
                        <Bot className="size-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        m.role === "user"
                          ? "bg-emerald-500 text-white"
                          : "bg-muted/60 text-foreground"
                      }`}
                    >
                      {m.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1.5 prose-headings:first:mt-0 prose-li:my-0.5 prose-p:my-1.5 prose-strong:text-foreground prose-code:text-emerald-700 prose-code:bg-emerald-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-[''] prose-code:after:content-[''] prose-code:text-xs">
                          <MarkdownRenderer content={m.content} />
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      )}
                    </div>
                    {m.role === "user" && (
                      <div className="size-8 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
                        <User className="size-4" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="size-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white shrink-0">
                    <Bot className="size-4" />
                  </div>
                  <div className="rounded-2xl bg-muted/60 px-4 py-3 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="size-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="size-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    <span className="text-xs text-muted-foreground ml-1">AI sedang berpikir...</span>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Input */}
          <div className="mt-4 flex gap-2 items-end">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  askQuestion();
                }
              }}
              placeholder="Tulis pertanyaan Anda... (Enter untuk kirim, Shift+Enter untuk baris baru)"
              rows={1}
              className="resize-none min-h-[42px] max-h-32"
              disabled={loading}
            />
            <Button
              onClick={askQuestion}
              disabled={loading || !question.trim()}
              size="icon"
              className="h-[42px] w-[42px] bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shrink-0"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
  color,
}: {
  icon: any;
  title: string;
  desc: string;
  color: "emerald" | "amber" | "sky";
}) {
  const colors = {
    emerald: "from-emerald-500/15 to-teal-500/5 border-emerald-500/20 text-emerald-600",
    amber: "from-amber-500/15 to-orange-500/5 border-amber-500/20 text-amber-600",
    sky: "from-sky-500/15 to-cyan-500/5 border-sky-500/20 text-sky-600",
  };
  return (
    <Card className={`bg-gradient-to-br ${colors[color]} border`}>
      <CardContent className="p-4">
        <div className={`size-9 rounded-lg bg-white/70 flex items-center justify-center mb-2 ${colors[color].split(" ").pop()}`}>
          <Icon className="size-4.5" strokeWidth={2.3} />
        </div>
        <h4 className="text-sm font-semibold">{title}</h4>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
      </CardContent>
    </Card>
  );
}

// Minimal markdown renderer (headings, bold, lists, code, paragraphs)
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  let para: string[] = [];

  const flushPara = () => {
    if (para.length > 0) {
      blocks.push(<p key={blocks.length}>{renderInline(para.join(" "))}</p>);
      para = [];
    }
  };
  const flushList = () => {
    if (list.length > 0) {
      blocks.push(
        <ul key={blocks.length} className="list-disc pl-5 space-y-0.5">
          {list.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      list = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trimEnd();
    if (/^##\s+/.test(trimmed)) {
      flushPara();
      flushList();
      blocks.push(<h3 key={blocks.length} className="text-sm">{renderInline(trimmed.replace(/^##\s+/, ""))}</h3>);
    } else if (/^#\s+/.test(trimmed)) {
      flushPara();
      flushList();
      blocks.push(<h2 key={blocks.length} className="text-base">{renderInline(trimmed.replace(/^#\s+/, ""))}</h2>);
    } else if (/^[-*]\s+/.test(trimmed)) {
      flushPara();
      list.push(trimmed.replace(/^[-*]\s+/, ""));
    } else if (/^\d+\.\s+/.test(trimmed)) {
      flushPara();
      list.push(trimmed.replace(/^\d+\.\s+/, ""));
    } else if (trimmed === "") {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(trimmed);
    }
  }
  flushPara();
  flushList();
  return <>{blocks}</>;
}

function renderInline(text: string): React.ReactNode {
  // Handle **bold**, `code`, and links
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    if (/^`[^`]+`$/.test(p)) {
      return <code key={i}>{p.slice(1, -1)}</code>;
    }
    return <span key={i}>{p}</span>;
  });
}
