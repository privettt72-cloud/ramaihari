"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Trend = {
  rank: number;
  title: string;
  keyword: string;
  traffic: string;
  trafficValue: number;

  newsTitle: string;
  newsUrl: string;
  newsSource: string;
  newsPicture: string;

  picture: string;
  pictureSource: string;

  pubDate: string;
  source: string;
  country: string;
  category: string;
};

type TrendsResponse = {
  success: boolean;
  source: string;
  country: string;
  updatedAt: string;
  total: number;
  trends: Trend[];
};

const categories = [
  "Semua",
  "Berita",
  "Hiburan",
  "Olahraga",
  "Teknologi",
  "Gaming",
];

function createSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function trafficToScore(trafficValue: number) {
  if (trafficValue >= 10000) return 90;
  if (trafficValue >= 5000) return 85;
  if (trafficValue >= 2000) return 80;
  if (trafficValue >= 1000) return 75;
  if (trafficValue >= 500) return 70;
  if (trafficValue >= 200) return 65;
  if (trafficValue >= 100) return 60;

  return 50;
}

function getCategoryStyle(category: string) {
  switch (category) {
    case "Olahraga":
      return "bg-blue-50 text-blue-700";

    case "Teknologi":
      return "bg-purple-50 text-purple-700";

    case "Hiburan":
      return "bg-pink-50 text-pink-700";

    case "Gaming":
      return "bg-indigo-50 text-indigo-700";

    default:
      return "bg-orange-50 text-orange-700";
  }
}

export default function TrendingPage() {
  const [trends, setTrends] =
    useState<Trend[]>([]);

  const [updatedAt, setUpdatedAt] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [selectedCategory, setSelectedCategory] =
    useState("Semua");

  const [searchQuery, setSearchQuery] =
    useState("");

  useEffect(() => {
    async function loadTrends() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "/api/trends",
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Gagal mengambil data tren."
          );
        }

        const data: TrendsResponse =
          await response.json();

        if (!data.success) {
          throw new Error(
            "Data tren tidak tersedia."
          );
        }

        setTrends(data.trends ?? []);
        setUpdatedAt(
          data.updatedAt ?? ""
        );
      } catch (err) {
        console.error(err);

        setError(
          "Gagal memuat data trending."
        );
      } finally {
        setLoading(false);
      }
    }

    loadTrends();
  }, []);

  const formatUpdatedTime = () => {
    if (!updatedAt) return "";

    return new Date(
      updatedAt
    ).toLocaleString(
      "id-ID",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  const filteredTrends =
    useMemo(() => {
      const query =
        searchQuery
          .toLowerCase()
          .trim();

      return trends.filter(
        (trend) => {
          const matchCategory =
            selectedCategory ===
              "Semua" ||
            trend.category ===
              selectedCategory;

          const matchSearch =
            !query ||
            trend.title
              .toLowerCase()
              .includes(query) ||
            trend.keyword
              .toLowerCase()
              .includes(query);

          return (
            matchCategory &&
            matchSearch
          );
        }
      );
    }, [
      trends,
      selectedCategory,
      searchQuery,
    ]);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">

      {/* HEADER */}

      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">

          <Link
            href="/"
            className="text-xl font-black tracking-tight"
          >
            RAMAI
            <span className="text-orange-500">
              HARI
            </span>
          </Link>

          <nav className="hidden gap-6 text-sm font-medium md:flex">

            <Link
              href="/trending"
              className="text-orange-500"
            >
              Trending
            </Link>

            <Link
              href="/"
              className="text-zinc-600 hover:text-zinc-900"
            >
              Berita
            </Link>

            <Link
              href="/"
              className="text-zinc-600 hover:text-zinc-900"
            >
              Produk
            </Link>

            <Link
              href="/"
              className="text-zinc-600 hover:text-zinc-900"
            >
              Hiburan
            </Link>

            <Link
              href="/"
              className="text-zinc-600 hover:text-zinc-900"
            >
              Olahraga
            </Link>

          </nav>

          <Link
            href="/search"
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-bold text-white hover:bg-zinc-700"
          >
            🔎 Cari
          </Link>

        </div>

      </header>

      {/* HERO */}

      <section className="border-b border-zinc-200 bg-white">

        <div className="mx-auto max-w-7xl px-5 py-12">

          <div className="max-w-3xl">

            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600">
              🔥 Live Trending Indonesia
            </div>

            <h1 className="text-4xl font-black tracking-tight md:text-6xl">
              Yang Lagi Ramai,
              <br />

              <span className="text-orange-500">
                Hari Ini.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-600">
              Pantau pencarian dan topik
              yang sedang ramai dibicarakan
              di internet Indonesia.
            </p>

            {updatedAt && (
              <p className="mt-4 text-sm text-zinc-500">
                Terakhir diperbarui:{" "}
                <span className="font-semibold text-zinc-700">
                  {formatUpdatedTime()}
                </span>
              </p>
            )}

          </div>

        </div>

      </section>

      {/* CONTENT */}

      <section className="mx-auto max-w-7xl px-5 py-10">

        {loading && (
          <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center">

            <div className="text-3xl">
              🔥
            </div>

            <p className="mt-3 font-semibold">
              Mengambil tren terbaru...
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Tunggu sebentar.
            </p>

          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">

            <p className="font-semibold text-red-700">
              {error}
            </p>

            <p className="mt-2 text-sm text-red-600">
              Pastikan server Next.js masih berjalan.
            </p>

          </div>
        )}

        {!loading &&
          !error &&
          trends.length > 0 && (
            <>

              {/* TITLE */}

              <div className="mb-6 flex items-end justify-between">

                <div>

                  <p className="text-sm font-semibold uppercase tracking-wider text-orange-500">
                    RAMAIHARI RADAR
                  </p>

                  <h2 className="mt-1 text-3xl font-black">
                    Trending Sekarang
                  </h2>

                </div>

                <div className="hidden text-right sm:block">

                  <p className="text-2xl font-black">
                    {filteredTrends.length}
                  </p>

                  <p className="text-xs text-zinc-500">
                    topik tampil
                  </p>

                </div>

              </div>

              {/* SEARCH */}

              <div className="mb-5">

                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(
                      event.target.value
                    )
                  }
                  placeholder="🔎 Cari topik trending..."
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />

              </div>

              {/* CATEGORY FILTER */}

              <div className="mb-8 flex gap-2 overflow-x-auto pb-2">

                {categories.map(
                  (category) => {

                    const active =
                      selectedCategory ===
                      category;

                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() =>
                          setSelectedCategory(
                            category
                          )
                        }
                        className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-bold transition ${
                          active
                            ? "bg-orange-500 text-white shadow-sm"
                            : "border border-zinc-200 bg-white text-zinc-600 hover:border-orange-300 hover:text-orange-500"
                        }`}
                      >
                        {category}
                      </button>
                    );
                  }
                )}

              </div>

              {/* EMPTY FILTER RESULT */}

              {filteredTrends.length === 0 && (
                <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-10 text-center">

                  <div className="text-5xl">
                    🔎
                  </div>

                  <h3 className="mt-4 text-xl font-black">
                    Tidak ditemukan
                  </h3>

                  <p className="mt-2 text-sm text-zinc-500">
                    Coba kata kunci atau kategori
                    yang berbeda.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory(
                        "Semua"
                      );
                    }}
                    className="mt-5 rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white"
                  >
                    Reset filter
                  </button>

                </div>
              )}

              {/* TREND LIST */}

              {filteredTrends.length > 0 && (
                <div className="grid gap-4">

                  {filteredTrends.map(
                    (trend) => {

                      const score =
                        trafficToScore(
                          trend.trafficValue
                        );

                      const slug =
                        createSlug(
                          trend.title
                        );

                      return (
                        <article
                          key={`${trend.rank}-${trend.keyword}`}
                          className="group overflow-hidden rounded-3xl border border-zinc-200 bg-white transition hover:-translate-y-0.5 hover:shadow-lg"
                        >

                          <div className="flex flex-col md:flex-row">

                            {/* IMAGE */}

                            {trend.picture && (
                              <div className="h-52 w-full shrink-0 overflow-hidden bg-zinc-100 md:h-auto md:w-64">

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

                            {/* CONTENT */}

                            <div className="flex-1 p-5 md:p-6">

                              <div className="flex items-start gap-4">

                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-sm font-black text-zinc-500">
                                  #{trend.rank}
                                </div>

                                <div className="min-w-0 flex-1">

                                  <div className="flex flex-wrap items-center gap-2">

                                    <span
                                      className={`rounded-full px-3 py-1 text-xs font-bold ${getCategoryStyle(
                                        trend.category
                                      )}`}
                                    >
                                      {trend.category}
                                    </span>

                                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-600">
                                      ↑ Ramai
                                    </span>

                                  </div>

                                  <Link
                                    href={`/trending/${slug}`}
                                    className="mt-3 block text-2xl font-black tracking-tight hover:text-orange-500"
                                  >
                                    {trend.title}
                                  </Link>

                                  <div className="mt-4 flex flex-wrap gap-4 text-sm">

                                    <div>

                                      <span className="text-zinc-500">
                                        Traffic
                                      </span>

                                      <p className="font-bold">
                                        {trend.traffic}
                                      </p>

                                    </div>

                                    <div>

                                      <span className="text-zinc-500">
                                        RAMAI Score
                                      </span>

                                      <p className="font-bold text-orange-500">
                                        {score}/100
                                      </p>

                                    </div>

                                    {trend.newsSource && (
                                      <div>

                                        <span className="text-zinc-500">
                                          Sumber
                                        </span>

                                        <p className="font-bold">
                                          {trend.newsSource}
                                        </p>

                                      </div>
                                    )}

                                  </div>

                                  {/* NEWS */}

                                  {trend.newsTitle && (
                                    <div className="mt-5 rounded-2xl bg-zinc-50 p-4">

                                      <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                                        Berita terkait
                                      </p>

                                      <p className="mt-1 line-clamp-2 text-sm font-semibold text-zinc-700">
                                        {trend.newsTitle}
                                      </p>

                                      {trend.newsUrl && (
                                        <a
                                          href={
                                            trend.newsUrl
                                          }
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="mt-2 inline-block text-xs font-bold text-orange-500 hover:text-orange-600"
                                        >
                                          Baca sumber berita →
                                        </a>
                                      )}

                                    </div>
                                  )}

                                </div>

                              </div>

                            </div>

                          </div>

                        </article>
                      );
                    }
                  )}

                </div>
              )}

              {/* SOURCE */}

              <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-500">

                <p>
                  <span className="font-semibold text-zinc-700">
                    Data tren:
                  </span>{" "}
                  Google Trends — Indonesia.
                </p>

                <p className="mt-1">
                  Data ditampilkan sebagai indikator
                  topik yang sedang ramai dan bukan
                  angka volume pencarian absolut.
                </p>

              </div>

            </>
          )}

        {!loading &&
          !error &&
          trends.length === 0 && (
            <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center">

              <p className="text-lg font-bold">
                Belum ada data trending.
              </p>

              <p className="mt-2 text-sm text-zinc-500">
                Coba refresh halaman beberapa saat
                lagi.
              </p>

            </div>
          )}

      </section>

    </main>
  );
}