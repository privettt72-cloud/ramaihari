import Link from "next/link";
import { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase-server";

type Trend = {
  id: string;
  keyword: string;
  title: string;
  category: string | null;
  traffic: string | null;
  traffic_value: number | null;
  source: string | null;
  source_url: string | null;
  picture: string | null;
  picture_source: string | null;
  trend_rank: number | null;
  trend_score: number | null;
  created_at: string;
  updated_at: string;
};

type Snapshot = {
  id: number;
  trend_id: string;
  traffic: string | null;
  traffic_value: number | null;
  trend_rank: number | null;
  recorded_at: string;
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString(
    "id-ID",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString(
    "id-ID",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function getCategoryStyle(
  category: string | null
) {
  switch (category) {
    case "Olahraga":
      return "bg-blue-50 text-blue-700";

    case "Teknologi":
      return "bg-purple-50 text-purple-700";

    case "Hiburan":
      return "bg-pink-50 text-pink-700";

    case "Gaming":
      return "bg-indigo-50 text-indigo-700";

    case "Musik":
      return "bg-violet-50 text-violet-700";

    default:
      return "bg-orange-50 text-orange-700";
  }
}

function getScore(
  score: number | null,
  trafficValue: number | null
) {
  if (score !== null) {
    return score;
  }

  const traffic =
    Number(trafficValue ?? 0);

  if (traffic >= 5000) return 95;
  if (traffic >= 2000) return 85;
  if (traffic >= 1000) return 75;
  if (traffic >= 500) return 70;
  if (traffic >= 200) return 65;
  if (traffic >= 100) return 60;

  return 50;
}

async function getTrend(
  keyword: string
) {
  const { data, error } =
    await supabaseServer
      .from("trends")
      .select("*")
      .eq("keyword", keyword)
      .maybeSingle();

  if (error) {
    console.error(
      "Gagal mengambil trend:",
      error
    );

    return null;
  }

  return data as Trend | null;
}

async function getSnapshots(
  trendId: string
) {
  const { data, error } =
    await supabaseServer
      .from("trend_snapshots")
      .select("*")
      .eq("trend_id", trendId)
      .order("recorded_at", {
        ascending: true,
      });

  if (error) {
    console.error(
      "Gagal mengambil snapshot:",
      error
    );

    return [];
  }

  return (data ?? []) as Snapshot[];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const keyword = decodeURIComponent(
    slug
  ).replace(/-/g, " ");

  const trend =
    await getTrend(keyword);

  if (!trend) {
    return {
      title: "Trend Belum Ditemukan | RAMAIHARI",
      description:
        "Trend tersebut belum tersedia di RAMAIHARI.",
    };
  }

  const category =
    trend.category ?? "Berita";

  return {
    title: `${trend.title} — Trend ${category} Hari Ini | RAMAIHARI`,
    description:
      `Lihat informasi trend ${trend.title}, RAMAI Score, traffic, posisi trending, dan riwayat pergerakannya di RAMAIHARI.`,
  };
}

export default async function TrendDetailPage({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const { slug } = await params;

  const keyword = decodeURIComponent(
    slug
  ).replace(/-/g, " ");

  const trend =
    await getTrend(keyword);

  if (!trend) {
    return (
      <main className="min-h-screen bg-zinc-50 px-5 py-20">
        <div className="mx-auto max-w-3xl text-center">

          <div className="text-6xl">
            🔎
          </div>

          <h1 className="mt-6 text-3xl font-black">
            Trend belum ditemukan
          </h1>

          <p className="mt-3 text-zinc-500">
            Data trend tersebut belum tersedia
            di RAMAIHARI.
          </p>

          <Link
            href="/trending"
            className="mt-8 inline-block rounded-2xl bg-orange-500 px-6 py-3 font-bold text-white"
          >
            ← Kembali ke Trending
          </Link>

        </div>
      </main>
    );
  }

  const snapshots =
    await getSnapshots(trend.id);

  const score = getScore(
    trend.trend_score,
    trend.traffic_value
  );

  const latestSnapshot =
    snapshots.length > 0
      ? snapshots[snapshots.length - 1]
      : null;

  /*
   * Cari snapshot sebelumnya yang
   * benar-benar berbeda posisi.
   *
   * Ini menghindari masalah ketika
   * beberapa snapshot berturut-turut
   * memiliki rank yang sama.
   */
  let previousSnapshot:
    | Snapshot
    | null = null;

  if (latestSnapshot) {
    for (
      let i = snapshots.length - 2;
      i >= 0;
      i--
    ) {
      const candidate =
        snapshots[i];

      if (
        candidate.trend_rank !==
        latestSnapshot.trend_rank
      ) {
        previousSnapshot =
          candidate;
        break;
      }
    }
  }

  let rankChange = 0;

  if (
    previousSnapshot &&
    latestSnapshot &&
    previousSnapshot.trend_rank !== null &&
    latestSnapshot.trend_rank !== null
  ) {
    rankChange =
      previousSnapshot.trend_rank -
      latestSnapshot.trend_rank;
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">

      {/* =========================
          HEADER
      ========================= */}

      <header className="border-b border-zinc-200 bg-white">

        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">

          <Link
            href="/"
            className="text-2xl font-black tracking-tight"
          >
            RAMAI
            <span className="text-orange-500">
              HARI
            </span>
          </Link>

          <Link
            href="/trending"
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-bold text-white"
          >
            Trending
          </Link>

        </div>

      </header>

      {/* =========================
          CONTENT
      ========================= */}

      <div className="mx-auto max-w-6xl px-5 py-8 md:py-12">

        {/* BACK */}

        <Link
          href="/trending"
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-orange-500"
        >
          ← Kembali ke Trending
        </Link>

        {/* =========================
            HERO DETAIL
        ========================= */}

        <section className="mt-6 overflow-hidden rounded-3xl border border-zinc-200 bg-white">

          {trend.picture && (
            <div className="aspect-[16/7] overflow-hidden bg-zinc-100">

              <img
                src={trend.picture}
                alt={trend.title}
                className="h-full w-full object-cover"
              />

            </div>
          )}

          <div className="p-6 md:p-10">

            <div className="flex flex-wrap items-center gap-3">

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${getCategoryStyle(
                  trend.category
                )}`}
              >
                {trend.category ??
                  "Berita"}
              </span>

              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600">
                Google Trends
              </span>

            </div>

            <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

              <div>

                <div className="text-sm font-bold uppercase tracking-wider text-orange-500">
                  #{trend.trend_rank ?? "-"} Trending
                </div>

                <h1 className="mt-2 text-4xl font-black capitalize tracking-tight md:text-6xl">
                  {trend.title}
                </h1>

              </div>

              {rankChange > 0 && (
                <div className="rounded-2xl bg-green-50 px-5 py-4 text-center">

                  <div className="text-2xl font-black text-green-600">
                    ↑ {rankChange}
                  </div>

                  <div className="text-xs font-semibold text-green-700">
                    naik peringkat
                  </div>

                </div>
              )}

              {rankChange < 0 && (
                <div className="rounded-2xl bg-red-50 px-5 py-4 text-center">

                  <div className="text-2xl font-black text-red-600">
                    ↓ {Math.abs(rankChange)}
                  </div>

                  <div className="text-xs font-semibold text-red-700">
                    turun peringkat
                  </div>

                </div>
              )}

              {rankChange === 0 && (
                <div className="rounded-2xl bg-zinc-50 px-5 py-4 text-center">

                  <div className="text-2xl font-black text-zinc-600">
                    —
                  </div>

                  <div className="text-xs font-semibold text-zinc-500">
                    posisi tetap
                  </div>

                </div>
              )}

            </div>

            {/* =========================
                STATS
            ========================= */}

            <div className="mt-8 grid gap-4 sm:grid-cols-4">

              <div className="rounded-2xl bg-zinc-50 p-5">

                <div className="text-sm text-zinc-500">
                  Traffic
                </div>

                <div className="mt-2 text-2xl font-black">
                  {trend.traffic ??
                    "-"}
                </div>

              </div>

              <div className="rounded-2xl bg-orange-50 p-5">

                <div className="text-sm text-orange-600">
                  RAMAI Score
                </div>

                <div className="mt-2 text-2xl font-black text-orange-600">
                  {score}
                </div>

              </div>

              <div className="rounded-2xl bg-zinc-50 p-5">

                <div className="text-sm text-zinc-500">
                  Posisi
                </div>

                <div className="mt-2 text-2xl font-black">
                  #{trend.trend_rank ?? "-"}
                </div>

              </div>

              <div className="rounded-2xl bg-zinc-50 p-5">

                <div className="text-sm text-zinc-500">
                  Snapshot
                </div>

                <div className="mt-2 text-2xl font-black">
                  {snapshots.length}
                </div>

              </div>

            </div>

          </div>

        </section>

        {/* =========================
            BERITA
        ========================= */}

        {trend.source_url && (
          <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-6 md:p-8">

            <div className="text-sm font-bold uppercase tracking-wider text-orange-500">
              Sumber
            </div>

            <h2 className="mt-2 text-2xl font-black">
              Berita terkait trend
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Trend ini terhubung dengan
              sumber berita yang ditampilkan
              oleh Google Trends.
            </p>

            <a
              href={trend.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white hover:bg-zinc-700"
            >
              Buka sumber berita →
            </a>

          </section>
        )}

        {/* =========================
            RIWAYAT TREND
        ========================= */}

        <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-6 md:p-8">

          <div>

            <div className="text-sm font-bold uppercase tracking-wider text-green-600">
              History
            </div>

            <h2 className="mt-2 text-2xl font-black">
              Riwayat Trend
            </h2>

            <p className="mt-2 text-sm text-zinc-500">
              Perubahan posisi trend yang
              tercatat oleh RAMAIHARI.
            </p>

          </div>

          {snapshots.length === 0 ? (
            <div className="mt-8 rounded-2xl bg-zinc-50 p-8 text-center text-sm text-zinc-500">
              Belum ada riwayat snapshot.
            </div>
          ) : (
            <div className="mt-8 space-y-3">

              {snapshots
                .slice()
                .reverse()
                .map(
                  (
                    snapshot,
                    index
                  ) => (
                    <div
                      key={snapshot.id}
                      className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-zinc-50 px-5 py-4"
                    >

                      <div className="flex items-center gap-4">

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white font-black">
                          #
                          {snapshot.trend_rank ??
                            "-"}
                        </div>

                        <div>

                          <div className="font-bold">
                            {snapshot.traffic ??
                              "-"}
                          </div>

                          <div className="text-xs text-zinc-400">
                            {formatDate(
                              snapshot.recorded_at
                            )}
                            {" · "}
                            {formatTime(
                              snapshot.recorded_at
                            )}
                          </div>

                        </div>

                      </div>

                      <div className="text-xs font-semibold text-zinc-400">
                        Snapshot{" "}
                        {snapshots.length -
                          index}
                      </div>

                    </div>
                  )
                )}

            </div>
          )}

        </section>

        {/* =========================
            FOOTER INFO
        ========================= */}

        <div className="mt-8 text-center text-xs text-zinc-400">

          Data diperbarui:
          {" "}
          {formatDate(
            trend.updated_at
          )}
          {" · "}
          {formatTime(
            trend.updated_at
          )}

          <div className="mt-2">
            Sumber data trend: Google Trends
          </div>

        </div>

      </div>

    </main>
  );
}