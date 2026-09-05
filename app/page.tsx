"use client";

import { useEffect, useState } from "react";

type Trend = {
  rank: number;
  title: string;
  keyword: string;
  traffic: string;
  trafficValue: number;
  trendScore: number;
  category: string;
  newsTitle?: string;
  newsUrl?: string;
  newsSource?: string;
  picture?: string;
  pictureSource?: string;
  trafficGrowth?: number;
};

type FastestRising = {
  id: string;
  keyword: string;
  title: string;
  category?: string;
  rank: number;
  previousRank: number | null;
  rankChange: number;
  currentTraffic: string;
  currentTrafficValue: number;
  previousTraffic: string;
  previousTrafficValue: number;
  growth: number;
  googleIncrease: number;
  score: number;
};

type TrendsResponse = {
  success: boolean;
  source: string;
  country: string;
  updatedAt: string;
  total: number;
  fastestRising: FastestRising[];
  trends: Trend[];
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatTime(dateString: string) {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  } catch {
    return "-";
  }
}

export default function Home() {
  const [data, setData] =
    useState<TrendsResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadTrends() {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch("/api/trends", {
            cache: "no-store",
          });

        if (!response.ok) {
          throw new Error(
            "Gagal mengambil data trending."
          );
        }

        const result =
          await response.json();

        if (!result.success) {
          throw new Error(
            result.error ||
              "Gagal mengambil data trending."
          );
        }

        setData(result);
      } catch (err) {
        console.error(err);

        setError(
          "Data trending belum dapat dimuat."
        );
      } finally {
        setLoading(false);
      }
    }

    loadTrends();
  }, []);

  const trends =
    data?.trends || [];

  const fastestRising =
    data?.fastestRising || [];

  function scrollToCategory(categoryId: string) {
    const element = document.getElementById(
      `kategori-${categoryId}`
    );

    element?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <a
            href="/"
            className="text-xl font-black tracking-tight sm:text-2xl"
          >
            RAMAI
            <span className="text-orange-500">
              HARI
            </span>
          </a>

          <nav className="hidden items-center gap-6 text-sm font-medium text-zinc-600 md:flex">
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("trending")
                  ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
              }
              className="transition hover:text-orange-500"
            >
              Trending
            </button>

            <button
              type="button"
              onClick={() =>
                scrollToCategory("berita")
              }
              className="transition hover:text-orange-500"
            >
              Berita
            </button>

            <button
              type="button"
              onClick={() =>
                scrollToCategory("hiburan")
              }
              className="transition hover:text-orange-500"
            >
              Hiburan
            </button>

            <button
              type="button"
              onClick={() =>
                scrollToCategory("olahraga")
              }
              className="transition hover:text-orange-500"
            >
              Olahraga
            </button>

            <button
              type="button"
              onClick={() =>
                scrollToCategory("gaming")
              }
              className="transition hover:text-orange-500"
            >
              Gaming
            </button>
          </nav>

          <button
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-orange-300 hover:text-orange-500"
            type="button"
          >
            Cari
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-600">
              <span>🔥</span>
              Indonesia Trending Radar
            </div>

            <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-6xl">
              Yang Lagi Ramai,
              <br />
              <span className="text-orange-500">
                Hari Ini.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 sm:text-lg">
              Pantau apa yang sedang ramai
              dibicarakan orang Indonesia —
              dari berita, olahraga, hiburan,
              gaming, sampai topik yang naik
              paling cepat.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-zinc-500">
              <span className="rounded-full bg-zinc-100 px-3 py-1.5">
                🇮🇩 Indonesia
              </span>

              <span className="rounded-full bg-zinc-100 px-3 py-1.5">
                Google Trends
              </span>

              {data?.updatedAt && (
                <span className="rounded-full bg-zinc-100 px-3 py-1.5">
                  Update{" "}
                  {formatTime(
                    data.updatedAt
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* MAIN */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {/* LOADING */}
        {loading && (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-orange-500" />

            <p className="font-semibold text-zinc-700">
              Mengambil trend hari ini...
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              RAMAIHARI sedang membaca radar
              trending Indonesia.
            </p>
          </div>
        )}

        {/* ERROR */}
        {!loading && error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
            <p className="font-bold text-red-700">
              {error}
            </p>

            <p className="mt-1 text-sm text-red-600">
              Coba refresh halaman beberapa
              saat lagi.
            </p>
          </div>
        )}

        {/* CONTENT */}
        {!loading &&
          !error &&
          data && (
            <>
              {/* TRENDING */}
              <section
                id="trending"
                className="scroll-mt-24"
              >
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-orange-500">
                      Real-time radar
                    </p>

                    <h2 className="mt-1 text-2xl font-black sm:text-3xl">
                      🔥 Trending Sekarang
                    </h2>

                    <p className="mt-1 text-sm text-zinc-500">
                      Topik yang sedang ramai
                      dicari di Indonesia.
                    </p>
                  </div>

                  <div className="hidden rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-600 sm:block">
                    {data.total} topik
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {trends.map(
                    (trend) => (
                      <article
                        key={
                          trend.keyword
                        }
                        className="group overflow-hidden rounded-3xl border border-zinc-200 bg-white transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg"
                      >
                        <div className="flex gap-4 p-5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-sm font-black text-zinc-500">
                            {trend.rank}
                          </div>

                          {trend.picture && (
                            <div className="hidden h-20 w-24 shrink-0 overflow-hidden rounded-2xl bg-zinc-100 sm:block">
                              <img
                                src={
                                  trend.picture
                                }
                                alt={
                                  trend.title
                                }
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                              />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-600">
                                {
                                  trend.category
                                }
                              </span>

                              {trend.trafficGrowth &&
                                trend.trafficGrowth >
                                  0 && (
                                  <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-600">
                                    ↑{" "}
                                    {
                                      trend.trafficGrowth
                                    }
                                    %
                                  </span>
                                )}
                            </div>

                            <h3 className="mt-2 text-lg font-black capitalize leading-snug">
                              {
                                trend.title
                              }
                            </h3>

                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                              <span>
                                🔎{" "}
                                {
                                  trend.traffic
                                }{" "}
                                pencarian
                              </span>

                              <span>
                                RAMAI{" "}
                                {
                                  trend.trendScore
                                }
                              </span>
                            </div>

                            {trend.newsTitle && (
                              <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-600">
                                {
                                  trend.newsTitle
                                }
                              </p>
                            )}

                            {trend.newsUrl && (
                              <a
                                href={
                                  trend.newsUrl
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="mt-3 inline-flex text-xs font-bold text-orange-500 hover:text-orange-600"
                              >
                                Baca berita →
                              </a>
                            )}
                          </div>
                        </div>
                      </article>
                    )
                  )}
                </div>
              </section>

              {/* FASTEST RISING */}
              <section className="mt-14">
                <div className="mb-5">
                  <p className="text-sm font-bold uppercase tracking-wider text-green-600">
                    Momentum
                  </p>

                  <h2 className="mt-1 text-2xl font-black sm:text-3xl">
                    🚀 Naik Tercepat
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    Topik yang mengalami
                    lonjakan perhatian paling
                    besar.
                  </p>
                </div>

                {fastestRising.length ===
                0 ? (
                  <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
                    Belum ada lonjakan trend
                    yang cukup kuat.
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {fastestRising.map(
                      (item) => {
                        const googleGrowth =
                          item.googleIncrease ||
                          0;

                        const trafficGrowth =
                          item.growth || 0;

                        const growth =
                          googleGrowth > 0
                            ? googleGrowth
                            : trafficGrowth;

                        return (
                          <article
                            key={
                              item.id
                            }
                            className="group rounded-3xl border border-zinc-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-green-200 hover:shadow-lg"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-50 text-lg">
                                🚀
                              </span>

                              {growth > 0 && (
                                <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-black text-green-600">
                                  +
                                  {growth}
                                  %
                                </span>
                              )}
                            </div>

                            <h3 className="mt-4 text-lg font-black capitalize leading-snug">
                              {
                                item.title
                              }
                            </h3>

                            {item.category && (
                              <div className="mt-2">
                                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-bold text-zinc-600">
                                  {
                                    item.category
                                  }
                                </span>
                              </div>
                            )}

                            <div className="mt-4 space-y-2 text-sm text-zinc-500">
                              <p>
                                Rank sekarang:{" "}
                                <strong className="text-zinc-900">
                                  #
                                  {
                                    item.rank
                                  }
                                </strong>
                              </p>

                              <p>
                                Traffic:{" "}
                                <strong className="text-zinc-900">
                                  {
                                    item.currentTraffic
                                  }
                                </strong>
                              </p>

                              {item.previousRank !==
                                null &&
                                item.rankChange >
                                  0 && (
                                  <p className="font-semibold text-green-600">
                                    ↑ Naik{" "}
                                    {
                                      item.rankChange
                                    }{" "}
                                    posisi
                                  </p>
                                )}
                            </div>

                            {googleGrowth >
                              0 && (
                              <div className="mt-4 border-t border-zinc-100 pt-3">
                                <p className="text-xs font-semibold text-zinc-400">
                                  Momentum Google
                                  Trends
                                </p>

                                <p className="mt-1 text-sm font-black text-green-600">
                                  +
                                  {
                                    googleGrowth
                                  }
                                  %
                                </p>
                              </div>
                            )}
                          </article>
                        );
                      }
                    )}
                  </div>
                )}
              </section>

              {/* AD SLOT */}
              <section className="my-14">
                <div className="flex min-h-28 items-center justify-center rounded-3xl border border-dashed border-zinc-300 bg-zinc-100">
                  <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                    Advertisement
                  </span>
                </div>
              </section>

              {/* CATEGORY GRID */}
              <section>
                <div className="mb-5">
                  <p className="text-sm font-bold uppercase tracking-wider text-orange-500">
                    Jelajahi
                  </p>

                  <h2 className="mt-1 text-2xl font-black sm:text-3xl">
                    Topik Berdasarkan Kategori
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {[
                    {
                      name: "Hiburan",
                      icon: "🎬",
                      id: "hiburan",
                    },
                    {
                      name: "Gaming",
                      icon: "🎮",
                      id: "gaming",
                    },
                    {
                      name: "Olahraga",
                      icon: "⚽",
                      id: "olahraga",
                    },
                    {
                      name: "Musik",
                      icon: "🎵",
                      id: "musik",
                    },
                    {
                      name: "Berita",
                      icon: "📰",
                      id: "berita",
                    },
                    {
                      name: "Teknologi",
                      icon: "💻",
                      id: "teknologi",
                    },
                  ].map(
                    (category) => {
                      const count =
                        trends.filter(
                          (trend) =>
                            trend.category ===
                            category.name
                        ).length;

                      return (
                        <a
                          key={
                            category.name
                          }
                          id={`kategori-${category.id}`}
                          href={`#kategori-${category.id}`}
                          className="group rounded-3xl border border-zinc-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md"
                        >
                          <div className="text-3xl">
                            {
                              category.icon
                            }
                          </div>

                          <h3 className="mt-4 font-black">
                            {
                              category.name
                            }
                          </h3>

                          <p className="mt-1 text-sm text-zinc-500">
                            {count} topik
                            ramai
                          </p>
                        </a>
                      );
                    }
                  )}
                </div>
              </section>

              {/* INSIGHT */}
              <section className="mt-14">
                <div className="rounded-3xl bg-zinc-950 p-6 text-white sm:p-8">
                  <p className="text-sm font-bold uppercase tracking-wider text-orange-400">
                    RAMAIHARI Insight
                  </p>

                  <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                    Radar hari ini menangkap{" "}
                    {data.total} topik.
                  </h2>

                  <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white/10 p-4">
                      <p className="text-sm text-zinc-400">
                        Topik #1
                      </p>

                      <p className="mt-1 font-black capitalize">
                        {
                          trends[0]
                            ?.title ||
                          "-"
                        }
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/10 p-4">
                      <p className="text-sm text-zinc-400">
                        Traffic tertinggi
                      </p>

                      <p className="mt-1 font-black">
                        {formatNumber(
                          Math.max(
                            ...trends.map(
                              (trend) =>
                                trend.trafficValue
                            ),
                            0
                          )
                        )}
                        +
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/10 p-4">
                      <p className="text-sm text-zinc-400">
                        Lonjakan tercepat
                      </p>

                      <p className="mt-1 font-black">
                        {fastestRising[0]
                          ?.googleIncrease
                          ? `+${fastestRising[0].googleIncrease}%`
                          : fastestRising[0]
                              ?.growth
                          ? `+${fastestRising[0].growth}%`
                          : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
      </div>

      {/* FOOTER */}
      <footer className="mt-10 border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-zinc-500 sm:px-6">
          <div className="font-black text-zinc-900">
            RAMAI
            <span className="text-orange-500">
              HARI
            </span>
          </div>

          <p>
            Yang Lagi Ramai, Hari Ini.
          </p>

          <p className="text-xs text-zinc-400">
            Data trending bersumber dari
            Google Trends.
          </p>
        </div>
      </footer>
    </main>
  );
}