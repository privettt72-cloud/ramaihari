import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";

type CategoryConfig = {
  name: string;
  emoji: string;
  description: string;
};

const categories: Record<string, CategoryConfig> = {
  berita: {
    name: "Berita",
    emoji: "📰",
    description:
      "Berita dan isu yang sedang ramai diperbincangkan.",
  },
  hiburan: {
    name: "Hiburan",
    emoji: "🎬",
    description:
      "Film, artis, selebriti, dan hiburan yang sedang ramai.",
  },
  gaming: {
    name: "Gaming",
    emoji: "🎮",
    description:
      "Game, esports, dan dunia gaming yang sedang ramai.",
  },
  olahraga: {
    name: "Olahraga",
    emoji: "⚽",
    description:
      "Pertandingan, atlet, klub, dan olahraga yang sedang ramai.",
  },
  musik: {
    name: "Musik",
    emoji: "🎵",
    description:
      "Musik, lagu, penyanyi, konser, dan musisi yang sedang ramai.",
  },
  teknologi: {
    name: "Teknologi",
    emoji: "💻",
    description:
      "Teknologi, AI, internet, gadget, dan startup yang sedang ramai.",
  },
};

type TrendRow = {
  id: string;
  keyword: string;
  title: string;
  category: string | null;
  traffic: string | null;
  traffic_value: number | null;
  trend_score: number | null;
  source: string | null;
  source_url: string | null;
  picture: string | null;
  picture_source: string | null;
  updated_at: string;
};

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 1000 / 60);

  if (diffMinutes < 1) {
    return "baru saja";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} menit lalu`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} jam lalu`;
  }

  const diffDays = Math.floor(diffHours / 24);

  return `${diffDays} hari lalu`;
}

function getFreshnessCutoff() {
  const cutoff = new Date(
    Date.now() - 30 * 60 * 1000
  );

  return cutoff.toISOString();
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const category =
    categories[slug.toLowerCase()];

  if (!category) {
    return (
      <main className="min-h-screen bg-zinc-50 text-zinc-900">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <Link
            href="/"
            className="text-sm font-semibold text-orange-600 hover:text-orange-700"
          >
            ← Kembali ke RAMAIHARI
          </Link>

          <h1 className="mt-8 text-3xl font-black">
            Kategori tidak ditemukan
          </h1>

          <p className="mt-3 text-zinc-600">
            Kategori yang kamu cari belum tersedia.
          </p>
        </div>
      </main>
    );
  }

  const freshnessCutoff =
    getFreshnessCutoff();

  const { data, error } =
    await supabaseServer
      .from("trends")
      .select(
        `
        id,
        keyword,
        title,
        category,
        traffic,
        traffic_value,
        trend_score,
        source,
        source_url,
        picture,
        picture_source,
        updated_at
        `
      )
      .eq("category", category.name)
      .gte("updated_at", freshnessCutoff)
      .order("trend_score", {
        ascending: false,
      });

  if (error) {
    console.error(
      "Category page error:",
      error
    );
  }

  const trends =
    (data as TrendRow[] | null) || [];

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      {/* HEADER */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4">
          <Link
            href="/"
            className="text-xl font-black tracking-tight"
          >
            RAMAIHARI
            <span className="text-orange-500">
              Trending
            </span>
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-semibold text-zinc-600 md:flex">
            <Link
              href="/kategori/berita"
              className="hover:text-orange-600"
            >
              Berita
            </Link>

            <Link
              href="/kategori/hiburan"
              className="hover:text-orange-600"
            >
              Hiburan
            </Link>

            <Link
              href="/kategori/gaming"
              className="hover:text-orange-600"
            >
              Gaming
            </Link>

            <Link
              href="/kategori/olahraga"
              className="hover:text-orange-600"
            >
              Olahraga
            </Link>

            <Link
              href="/kategori/musik"
              className="hover:text-orange-600"
            >
              Musik
            </Link>

            <Link
              href="/kategori/teknologi"
              className="hover:text-orange-600"
            >
              Teknologi
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* BREADCRUMB */}
        <div className="text-sm text-zinc-500">
          <Link
            href="/"
            className="hover:text-orange-600"
          >
            Beranda
          </Link>

          <span className="mx-2">/</span>

          <span>{category.name}</span>
        </div>

        {/* HERO CATEGORY */}
        <section className="mt-8">
          <div className="flex items-start gap-4">
            <div className="text-4xl">
              {category.emoji}
            </div>

            <div>
              <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                {category.name}
              </h1>

              <p className="mt-2 max-w-2xl text-zinc-600">
                {category.description}
              </p>
            </div>
          </div>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Tren aktif
            <span className="font-black text-orange-600">
              {trends.length}
            </span>
          </div>
        </section>

        {/* TRENDING */}
        <section className="mt-10">
          <div className="mb-5">
            <h2 className="text-2xl font-black">
              🔥 Yang Lagi Ramai
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Diurutkan berdasarkan RAMAI Score
            </p>
          </div>

          {trends.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
              <div className="text-3xl">
                📡
              </div>

              <h3 className="mt-3 font-bold">
                Belum ada tren aktif
              </h3>

              <p className="mt-1 text-sm text-zinc-500">
                Belum ada topik terbaru di kategori ini.
              </p>

              <Link
                href="/"
                className="mt-5 inline-flex rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600"
              >
                Lihat semua trending
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {trends.map(
                (trend, index) => {
                  const href = `/trending/${encodeURIComponent(
                    trend.keyword
                  )}`;

                  return (
                    <Link
                      key={trend.id}
                      href={href}
                      className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-sm font-black">
                            #{index + 1}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-lg bg-orange-50 px-2 py-1 text-xs font-black text-orange-600">
                                RAMAI{" "}
                                {Number(
                                  trend.trend_score
                                ) || 0}
                              </span>

                              <span className="text-xs text-zinc-400">
                                {formatTimeAgo(
                                  trend.updated_at
                                )}
                              </span>
                            </div>

                            <h3 className="mt-3 line-clamp-2 text-lg font-black capitalize leading-tight group-hover:text-orange-600">
                              {trend.keyword}
                            </h3>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-xs text-zinc-400">
                            TRAFFIC
                          </div>

                          <div className="mt-1 font-black text-zinc-900">
                            {trend.traffic ||
                              `${trend.traffic_value || 0}+`}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4">
                        <span className="text-xs font-semibold text-zinc-500">
                          🔥 Google Trends
                        </span>

                        <span className="text-xs font-bold text-orange-600 group-hover:underline">
                          Lihat detail →
                        </span>
                      </div>
                    </Link>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* BACK */}
        <div className="mt-10 border-t border-zinc-200 pt-6">
          <Link
            href="/"
            className="text-sm font-bold text-orange-600 hover:text-orange-700"
          >
            ← Kembali ke RAMAIHARI
          </Link>
        </div>
      </div>
    </main>
  );
}