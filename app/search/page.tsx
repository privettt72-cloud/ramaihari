import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";

type Trend = {
  id: string;
  keyword: string;
  title: string;
  category: string | null;
  traffic: string | null;
  traffic_value: number | null;
  trend_rank: number | null;
  trend_score: number | null;
  picture: string | null;
};

function createSlug(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
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

    default:
      return "bg-orange-50 text-orange-700";
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
  }>;
}) {
  const params = await searchParams;

  const query =
    params.q?.trim() ?? "";

  let trends: Trend[] = [];

  if (query) {
    const searchTerm =
      `%${query}%`;

    const { data, error } =
      await supabaseServer
        .from("trends")
        .select(
          "id, keyword, title, category, traffic, traffic_value, trend_rank, trend_score, picture"
        )
        .or(
          `title.ilike.${searchTerm},keyword.ilike.${searchTerm}`
        )
        .order(
          "trend_score",
          {
            ascending: false,
          }
        )
        .limit(20);

    if (error) {
      console.error(
        "Gagal mencari trend:",
        error
      );
    } else {
      trends =
        (data ?? []) as Trend[];
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">

      {/* HEADER */}

      <header className="border-b border-zinc-200 bg-white">

        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">

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

      {/* CONTENT */}

      <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">

        <div className="max-w-3xl">

          <p className="text-sm font-bold uppercase tracking-wider text-orange-500">
            RAMAIHARI Search
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">
            Cari yang lagi ramai.
          </h1>

          <p className="mt-4 text-zinc-500">
            Temukan topik yang sedang
            trending di Indonesia.
          </p>

        </div>

        {/* SEARCH FORM */}

        <form
          action="/search"
          method="GET"
          className="mt-8 flex flex-col gap-3 sm:flex-row"
        >

          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Cari topik, misalnya: sam altman"
            className="min-h-14 flex-1 rounded-2xl border border-zinc-200 bg-white px-5 text-base outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          />

          <button
            type="submit"
            className="min-h-14 rounded-2xl bg-orange-500 px-7 font-bold text-white transition hover:bg-orange-600"
          >
            🔎 Cari
          </button>

        </form>

        {/* HASIL */}

        {query && (
          <div className="mt-10">

            <div className="mb-5 flex items-center justify-between">

              <div>
                <h2 className="text-2xl font-black">
                  Hasil pencarian
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Untuk:
                  {" "}
                  <span className="font-semibold text-zinc-700">
                    “{query}”
                  </span>
                </p>
              </div>

              <span className="text-sm font-semibold text-zinc-400">
                {trends.length} hasil
              </span>

            </div>

            {trends.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-10 text-center">

                <div className="text-5xl">
                  🔎
                </div>

                <h3 className="mt-4 text-xl font-black">
                  Belum ditemukan
                </h3>

                <p className="mt-2 text-sm text-zinc-500">
                  Coba gunakan kata kunci
                  yang berbeda.
                </p>

                <Link
                  href="/trending"
                  className="mt-6 inline-block rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white"
                >
                  Lihat semua trending
                </Link>

              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">

                {trends.map(
                  (trend) => (
                    <Link
                      key={trend.id}
                      href={`/trending/${createSlug(
                        trend.keyword
                      )}`}
                      className="group overflow-hidden rounded-3xl border border-zinc-200 bg-white transition hover:-translate-y-1 hover:shadow-lg"
                    >

                      {trend.picture && (
                        <div className="aspect-[16/8] overflow-hidden bg-zinc-100">

                          <img
                            src={trend.picture}
                            alt={trend.title}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />

                        </div>
                      )}

                      <div className="p-5">

                        <div className="flex items-center justify-between gap-3">

                          <span className="text-sm font-black text-zinc-300">
                            #{trend.trend_rank ?? "-"}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${getCategoryStyle(
                              trend.category
                            )}`}
                          >
                            {trend.category ??
                              "Berita"}
                          </span>

                        </div>

                        <h3 className="mt-4 text-xl font-black capitalize">
                          {trend.title}
                        </h3>

                        <div className="mt-4 flex items-center justify-between">

                          <span className="text-sm font-semibold text-zinc-500">
                            🔎{" "}
                            {trend.traffic ??
                              "-"}
                          </span>

                          <span className="font-black text-orange-500">
                            {trend.trend_score ??
                              0}
                          </span>

                        </div>

                        <div className="mt-1 text-right text-xs text-zinc-400">
                          RAMAI Score
                        </div>

                      </div>

                    </Link>
                  )
                )}

              </div>
            )}

          </div>
        )}

        {/* EMPTY STATE */}

        {!query && (
          <div className="mt-10 rounded-3xl border border-zinc-200 bg-white p-10">

            <div className="text-4xl">
              🔥
            </div>

            <h2 className="mt-4 text-2xl font-black">
              Mau tahu apa yang ramai?
            </h2>

            <p className="mt-2 max-w-xl text-zinc-500">
              Cari nama orang, berita,
              pertandingan, teknologi,
              atau topik lain yang sedang
              ramai dibicarakan.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">

              {[
                "sam altman",
                "hujan",
                "bali",
                "telkom",
                "gempa",
              ].map(
                (suggestion) => (
                  <Link
                    key={suggestion}
                    href={`/search?q=${encodeURIComponent(
                      suggestion
                    )}`}
                    className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-semibold transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600"
                  >
                    {suggestion}
                  </Link>
                )
              )}

            </div>

          </div>
        )}

      </div>

    </main>
  );
}