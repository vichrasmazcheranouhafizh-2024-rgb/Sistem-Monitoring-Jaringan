import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // body contains: { metrics, question? }
    const { metrics, question } = body as {
      metrics: {
        bandwidth?: any;
        quality?: any;
        interface?: any;
        devices?: any;
        processes?: any;
        cpu?: any;
      };
      question?: string;
    };

    const zai = await ZAI.create();

    const systemPrompt = `Anda adalah NetPulse AI — asisten ahli jaringan komputer & sistem operasi.
Tugas Anda: menganalisis metrik jaringan dan sistem dari aplikasi monitoring "NetPulse",
lalu memberikan insight yang konkret, ringkas, dan mudah dipahami dalam Bahasa Indonesia.

Pedoman:
- JAWAB SELALU dalam Bahasa Indonesia yang natural, profesional namun ramah.
- Gunakan format Markdown ringkas: ## untuk bagian, **tebal** untuk angka penting, - untuk poin.
- Maksimal 5 rekomendasi actionable. Setiap rekomendasi: 1 kalimat masalah + 1-2 kalimat solusi.
- Sebutkan angka spesifik dari data yang diberikan (mis. "ping rata-rata 23 ms", "packet loss 0%").
- Jika data terlihat sehat, katakan demikian dan berikan tips optimasi pencegahan.
- Untuk pertanyaan pengguna, jawab langsung dan padat (maks 250 kata).`;

    const userPrompt = question
      ? `Pertanyaan pengguna: ${question}

Berikut adalah snapshot metrik terkini dari sistem (JSON):
\`\`\`json
${JSON.stringify(metrics, null, 2).slice(0, 6000)}
\`\`\`

Jawab pertanyaan pengguna berdasarkan data di atas.`
      : `Berikut adalah snapshot metrik jaringan & sistem dari aplikasi NetPulse (JSON):
\`\`\`json
${JSON.stringify(metrics, null, 2).slice(0, 6000)}
\`\`\`

Buat analisis & rekomendasi yang mencakup:
1. **Ringkasan Kesehatan** — overall health jaringan & sistem (skala 0-100 jika memungkinkan)
2. **Analisis Bandwidth** — apakah throughput normal, ada bottleneck?
3. **Analisis Kualitas Koneksi** — latency, jitter, packet loss ke target lokal/global
4. **Analisis Proses & CPU** — proses yang paling membebani, multi-core balance
5. **Rekomendasi Actionable** — 3-5 langkah konkret untuk meningkatkan performa`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      thinking: { type: "disabled" },
      temperature: 0.4,
    });

    const content = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ ok: true, content, ts: Date.now() });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        content:
          "Maaf, layanan AI sedang tidak tersedia. Silakan coba beberapa saat lagi.\n\nError: " +
          (err?.message ?? "unknown"),
        ts: Date.now(),
      },
      { status: 200 }
    );
  }
}
