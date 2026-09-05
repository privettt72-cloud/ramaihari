
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

  news_title: string | null;
  news_summary: string | null;
  news_source: string | null;
  news_url: string | null;
  news_published_at: string | null;

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
      title:
        "Trend Belum Ditemukan | RAMAIHARI",
      description:
        "Trend tersebut belum tersedia di RAMAIHARI.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const category =
    trend.category ?? "Berita";

  const title =
    trend.news_title
      ? `${trend.news_title} | RAMAIHARI`
      : `${trend.title} — Trend ${category} Hari Ini | RAMAIHARI`;

  const description =
    trend.news_summary ??
    `Pantau trend ${trend.title} di Google Indonesia. Lihat RAMAI Score, traffic, posisi trending, pergerakan ranking, dan berita terkait di RAMAIHARI.`;

  const canonicalUrl =
    `https://ramaihari.com/trending/${encodeURIComponent(
      trend.keyword
    )}`;

  return {
    title,
    description,

    alternates: {
      canonical: canonicalUrl,
    },

    robots: {
      index: true,
      follow: true,
    },

    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "RAMAIHARI",
      locale: "id_ID",
      type: "article",

      publishedTime:
        trend.news_published_at ??
        undefined,

      images: trend.picture
        ? [
            {
              url: trend.picture,
              alt: trend.title,
            },
          ]
        : undefined,
    },

    twitter: {
      card: trend.picture
        ? "summary_large_image"
        : "summary",

      title,
      description,

      images: trend.picture
        ? [trend.picture]
        : undefined,
    },
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

  const newsTitle =
    trend.news_title ??
    trend.title;

  const newsSource =
    trend.news_source ??
    trend.source ??
    "Sumber berita";

  // Hanya gunakan URL artikel publisher.
  // Jangan fallback ke source_url karena source_url
  // bisa berupa URL Google Trends.
  const newsUrl =
    trend.news_url;

  const hasNews =
    Boolean(
      trend.news_title ||
      trend.news_summary ||
      trend.news_url
    );

  const trendExplanation =
    trend.news_summary
      ? `${trend.news_title ?? trend.title} menjadi berita yang berkaitan dengan meningkatnya perhatian terhadap topik ${trend.title} di Google Indonesia.`
      : `Topik ${trend.title} sedang masuk dalam daftar trend Google Indonesia dengan posisi #${
          trend.trend_rank ?? "-"
        }. RAMAIHARI mencatat traffic ${
          trend.traffic ?? "-"
        } dan RAMAI Score ${score} untuk menunjukkan tingkat perhatian terhadap topik ini.`;

  const movementText =
    rankChange > 0
      ? `Dalam riwayat pemantauan terbaru, topik ini naik ${rankChange} peringkat dari posisi sebelumnya.`
      : rankChange < 0
      ? `Dalam riwayat pemantauan terbaru, topik ini turun ${Math.abs(
          rankChange
        )} peringkat dari posisi sebelumnya.`
      : "Dalam riwayat pemantauan terbaru, posisi topik ini relatif stabil.";

  const latestSnapshots =
    snapshots
      .slice()
      .reverse()
      .slice(0, 10);

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

        <Link
          href="/trending"
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-orange-500"
        >
          ← Kembali ke Trending
        </Link>

        {/* =========================
            HERO
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

              <div>

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
                  {trend.traffic ?? "-"}
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
            BERITA TERKAIT
        ========================= */}

        {hasNews && (
          <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-6 md:p-8">

            <div className="text-sm font-bold uppercase tracking-wider text-orange-500">
              📰 Berita terkait
            </div>

            <h2 className="mt-2 text-3xl font-black tracking-tight">
              {newsTitle}
            </h2>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-zinc-500">

              <span className="font-bold text-zinc-700">
                {newsSource}
              </span>

              {trend.news_published_at && (
                <>
                  <span>·</span>

                  <span>
                    {formatDate(
                      trend.news_published_at
                    )}
                  </span>
                </>
              )}

            </div>

            {trend.news_summary ? (
              <div className="mt-7">

                <div className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                  Ringkasan
                </div>

                <p className="mt-3 max-w-4xl text-lg leading-8 text-zinc-700">
                  {trend.news_summary}
                </p>

              </div>
            ) : (
              <div className="mt-6 rounded-2xl bg-zinc-50 p-5">

                <p className="text-sm leading-6 text-zinc-500">
                  Ringkasan artikel belum tersedia
                  dari sumber berita. RAMAIHARI tetap
                  menampilkan judul, sumber, tanggal,
                  dan data trend yang berkaitan dengan
                  topik ini.
                </p>

              </div>
            )}

            {newsUrl && (
              <a
                href={newsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-7 inline-flex items-center rounded-2xl bg-zinc-900 px-6 py-3 font-bold text-white transition hover:bg-orange-500"
              >
                Baca artikel lengkap →
              </a>
            )}

            <div className="mt-5 border-t border-zinc-100 pt-5 text-xs leading-5 text-zinc-400">
              RAMAIHARI menampilkan informasi
              ringkas dan mengarahkan pembaca ke
              sumber artikel asli.
            </div>

          </section>
        )}

        {/* =========================
            TENTANG TREND
        ========================= */}

        <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-6 md:p-8">

          <div className="text-sm font-bold uppercase tracking-wider text-blue-500">
            Tentang Trend
          </div>

          <h2 className="mt-2 text-2xl font-black">
            Kenapa {trend.title} sedang ramai?
          </h2>

          <div className="mt-4 max-w-4xl space-y-4 text-base leading-7 text-zinc-600">

            <p>
              {trendExplanation}
            </p>

            <p>
              {movementText}
            </p>

            {trend.news_title && (
              <p>
                Berita terkait yang tercatat
                berasal dari{" "}
                <strong>
                  {newsSource}
                </strong>
                , dengan judul{" "}
                <strong>
                  {trend.news_title}
                </strong>
                .
              </p>
            )}

          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">

            <div className="rounded-2xl bg-zinc-50 p-5">

              <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Traffic
              </div>

              <div className="mt-2 text-xl font-black">
                {trend.traffic ?? "-"}
              </div>

            </div>

            <div className="rounded-2xl bg-zinc-50 p-5">

              <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Kategori
              </div>

              <div className="mt-2 text-xl font-black">
                {trend.category ??
                  "Berita"}
              </div>

            </div>

            <div className="rounded-2xl bg-zinc-50 p-5">

              <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                RAMAI Score
              </div>

              <div className="mt-2 text-xl font-black text-orange-500">
                {score}
              </div>

            </div>

          </div>

        </section>

        {/* =========================
            RIWAYAT
        ========================= */}

        <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-6 md:p-8">

          <div>

            <div className="text-sm font-bold uppercase tracking-wider text-green-600">
              History
            </div>

            <h2 className="mt-2 text-2xl font-black">
              Riwayat Trend
            </h2>

            <p className="mt-2 text-zinc-500">
              Perubahan posisi trend terbaru
              yang tercatat oleh RAMAIHARI.
            </p>

          </div>

          {snapshots.length === 0 ? (
            <div className="mt-8 rounded-2xl bg-zinc-50 p-8 text-center text-sm text-zinc-500">
              Belum ada riwayat snapshot.
            </div>
          ) : (
            <>
              <div className="mt-8 space-y-3">

                {latestSnapshots.map(
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

              {snapshots.length > 10 && (
                <div className="mt-5 text-center text-xs text-zinc-400">
                  Menampilkan 10 snapshot
                  terbaru dari{" "}
                  {snapshots.length} snapshot
                  yang tercatat.
                </div>
              )}
            </>
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

