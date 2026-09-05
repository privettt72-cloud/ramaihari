import { NextResponse } from "next/server";
import { fetchTrendingNow } from "google-trends-now";
import { supabaseServer } from "@/lib/supabase-server";

type TrendItem = {
  query?: string;
  normalized_query?: string;
  search_volume?: number;
  search_volume_label?: string;
  increase_percentage?: number;
  position?: number;
  raw_position?: number;
  started_at?: string;
  start_timestamp?: number;
  categories?: string[];
  explore_url?: string;
};

type TrendRow = {
  id: string;
  keyword: string;
  title: string;
  category: string | null;
  traffic: string | null;
  traffic_value: number;
  source: string | null;
  source_url: string | null;
  picture: string | null;
  picture_source: string | null;
  trend_rank: number;
  trend_score: number;
  created_at: string;
  updated_at: string;
};

type SnapshotRow = {
  id: number;
  trend_id: string;
  traffic: string | null;
  traffic_value: number;
  trend_rank: number;
  recorded_at: string;
};

type FastestRising = {
  id: string;
  keyword: string;
  title: string;
  category: string | null;
  currentTraffic: string | null;
  currentTrafficValue: number;
  previousTraffic: string | null;
  previousTrafficValue: number;
  growth: number;
  googleIncrease: number;
  rank: number;
  previousRank: number;
  rankChange: number;
  score: number;
};

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTrafficValue(
  value: unknown,
  fallback = 0
): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const text = cleanText(value);

  if (!text) {
    return fallback;
  }

  const match = text.replace(/,/g, "").match(/[\d.]+/);

  if (!match) {
    return fallback;
  }

  const number = Number(match[0]);

  return Number.isFinite(number)
    ? Math.round(number)
    : fallback;
}

function trafficScore(trafficValue: number): number {
  if (trafficValue >= 200000) return 100;
  if (trafficValue >= 50000) return 95;
  if (trafficValue >= 10000) return 90;
  if (trafficValue >= 5000) return 85;
  if (trafficValue >= 2000) return 80;
  if (trafficValue >= 1000) return 75;
  if (trafficValue >= 500) return 65;
  if (trafficValue >= 200) return 55;
  if (trafficValue >= 100) return 45;
  if (trafficValue > 0) return 30;

  return 0;
}

function momentumScore(
  increasePercentage: number
): number {
  if (increasePercentage >= 1000) return 100;
  if (increasePercentage >= 500) return 95;
  if (increasePercentage >= 300) return 90;
  if (increasePercentage >= 200) return 85;
  if (increasePercentage >= 100) return 80;
  if (increasePercentage >= 50) return 70;
  if (increasePercentage >= 25) return 60;
  if (increasePercentage >= 10) return 50;
  if (increasePercentage > 0) return 30;

  return 0;
}

function rankingScore(rank: number): number {
  switch (rank) {
    case 1:
      return 100;
    case 2:
      return 95;
    case 3:
      return 90;
    case 4:
      return 85;
    case 5:
      return 80;
    case 6:
      return 70;
    case 7:
      return 60;
    case 8:
      return 50;
    case 9:
      return 40;
    case 10:
      return 30;
    default:
      return 20;
  }
}

function recencyScore(
  startedAt?: string,
  startTimestamp?: number
): number {
  let startedTime = 0;

  if (startedAt) {
    const parsed = new Date(startedAt).getTime();

    if (Number.isFinite(parsed)) {
      startedTime = parsed;
    }
  }

  if (!startedTime && startTimestamp) {
    startedTime =
      startTimestamp > 10_000_000_000
        ? startTimestamp
        : startTimestamp * 1000;
  }

  if (!startedTime) {
    return 50;
  }

  const ageMinutes = Math.max(
    0,
    (Date.now() - startedTime) / 60000
  );

  if (ageMinutes <= 30) return 100;
  if (ageMinutes <= 60) return 85;
  if (ageMinutes <= 120) return 70;

  return 50;
}

function calculateTrendScore(params: {
  trafficValue: number;
  increasePercentage: number;
  rank: number;
  startedAt?: string;
  startTimestamp?: number;
}): number {
  const traffic = trafficScore(
    params.trafficValue
  );

  const momentum = momentumScore(
    params.increasePercentage
  );

  const ranking = rankingScore(
    params.rank
  );

  const recency = recencyScore(
    params.startedAt,
    params.startTimestamp
  );

  const score =
    traffic * 0.35 +
    momentum * 0.35 +
    ranking * 0.2 +
    recency * 0.1;

  return Number(score.toFixed(2));
}

function getCategory(
  title: string,
  keyword: string,
  categories?: string[]
): string {
  const text =
    `${title} ${keyword}`.toLowerCase();

  const googleCategory = (categories || [])
    .join(" ")
    .toLowerCase();

  const combined =
    `${text} ${googleCategory}`;

  const olahragaKeywords = [
    "vs",
    "versus",
    "fc",
    "psg",
    "liverpool",
    "real madrid",
    "real betis",
    "betis",
    "ipswich",
    "monaco",
    "arema",
    "adhyaksa",
    "bali united",
    "pss",
    "genoa",
    "como",
    "persija",
    "borneo",
    "persib",
    "persis",
    "persebaya",
    "liga",
    "klasemen",
    "sepak bola",
    "football",
    "fifa",
    "uefa",
    "nba",
    "nfl",
    "formula 1",
    "motogp",
    "tenis",
    "badminton",
    "bulutangkis",
  ];

  const gamingKeywords = [
    "game",
    "gaming",
    "mobile legends",
    "mlbb",
    "free fire",
    "valorant",
    "pubg",
    "minecraft",
    "roblox",
    "genshin",
    "playstation",
    "xbox",
    "nintendo",
    "steam",
  ];

  const musikKeywords = [
    "lagu",
    "musik",
    "music",
    "album",
    "konser",
    "concert",
    "penyanyi",
    "singer",
    "band",
    "spotify",
    "billboard",
  ];

  const hiburanKeywords = [
    "film",
    "movie",
    "drakor",
    "drama korea",
    "series",
    "serial",
    "artis",
    "aktor",
    "aktris",
    "seleb",
    "celebrity",
    "netflix",
    "youtube",
    "tiktok",
  ];

  const teknologiKeywords = [
    "iphone",
    "android",
    "samsung",
    "google",
    "apple",
    "ai",
    "artificial intelligence",
    "teknologi",
    "technology",
    "chatgpt",
    "gemini",
    "windows",
    "laptop",
    "smartphone",
  ];

  if (
    olahragaKeywords.some((item) =>
      combined.includes(item)
    )
  ) {
    return "Olahraga";
  }

  if (
    gamingKeywords.some((item) =>
      combined.includes(item)
    )
  ) {
    return "Gaming";
  }

  if (
    musikKeywords.some((item) =>
      combined.includes(item)
    )
  ) {
    return "Musik";
  }

  if (
    hiburanKeywords.some((item) =>
      combined.includes(item)
    )
  ) {
    return "Hiburan";
  }

  if (
    teknologiKeywords.some((item) =>
      combined.includes(item)
    )
  ) {
    return "Teknologi";
  }

  return "Berita";
}

async function getGoogleTrends(): Promise<{
  items: TrendItem[];
  source: string;
}> {
  const result = await fetchTrendingNow({
    geo: "ID",
    hours: 24,
    sort: "volume",
    limit: 10,
    fallback: "none",
    timeoutMs: 20_000,
  });

  console.log("Google Trends result:", {
    fetch_status: result?.fetch_status,
    item_count: result?.items?.length || 0,
    error: result?.error || null,
  });

  if (
    result?.fetch_status !== "success" ||
    !result?.items?.length
  ) {
    throw new Error(
      result?.error ||
        "Google Trends tidak mengembalikan data."
    );
  }

  return {
    items: result.items as TrendItem[],
    source: "Google Trends Trending Now",
  };
}

function calculateTrafficGrowth(
  currentValue: number,
  previousValue: number
): number {
  if (previousValue <= 0) {
    return currentValue > 0 ? 100 : 0;
  }

  return Number(
    (
      ((currentValue - previousValue) /
        previousValue) *
      100
    ).toFixed(2)
  );
}

function calculateRankChange(
  previousRank: number,
  currentRank: number
): number {
  if (!previousRank || !currentRank) {
    return 0;
  }

  return previousRank - currentRank;
}

function calculateRisingScore(params: {
  googleIncrease: number;
  snapshotGrowth: number;
  rankChange: number;
  trafficValue: number;
}): number {
  /*
   * Naik Tercepat:
   *
   * 50% = momentum Google Trends
   * 25% = perubahan traffic snapshot RAMAIHARI
   * 15% = kenaikan ranking
   * 10% = kekuatan traffic saat ini
   */

  const googleMomentum = Math.min(
    Math.max(params.googleIncrease, 0),
    1000
  );

  const snapshotMomentum = Math.min(
    Math.max(params.snapshotGrowth, 0),
    1000
  );

  const rankMomentum = Math.min(
    Math.max(params.rankChange, 0),
    10
  );

  const traffic = trafficScore(
    params.trafficValue
  );

  const score =
    (googleMomentum / 10) * 0.5 +
    (snapshotMomentum / 10) * 0.25 +
    (rankMomentum * 10) * 0.15 +
    traffic * 0.1;

  return Number(score.toFixed(2));
}

export async function GET() {
  try {
    let items: TrendItem[] = [];
    let source = "Google Trends Trending Now";
    let fallback = false;

    /*
     * =========================================================
     * 1. GOOGLE TRENDS
     * =========================================================
     */

    try {
      const googleData =
        await getGoogleTrends();

      items = googleData.items;
      source = googleData.source;
    } catch (googleError) {
      console.warn(
        "Google Trends unavailable, using Supabase fallback:",
        googleError
      );

      fallback = true;

      const {
        data: fallbackData,
        error,
      } = await supabaseServer
        .from("trends")
        .select(
          `
          id,
          keyword,
          title,
          category,
          traffic,
          traffic_value,
          source,
          source_url,
          picture,
          picture_source,
          trend_rank,
          trend_score,
          created_at,
          updated_at
          `
        )
        .order("trend_score", {
          ascending: false,
        })
        .limit(10);

      if (error) {
        throw error;
      }

      const fallbackRows =
        (fallbackData || []) as TrendRow[];

      return NextResponse.json({
        success: true,
        source: "Supabase fallback",
        country: "Indonesia",
        updatedAt:
          new Date().toISOString(),
        total: fallbackRows.length,
        fallback: true,
        database: {
          inserted: 0,
          updated: 0,
          snapshotsCreated: 0,
          snapshotsSkipped: 0,
        },
        fastestRising: [],
        trends: fallbackRows.map(
          (row) => ({
            id: row.id,
            keyword: row.keyword,
            title: row.title,
            category: row.category,
            traffic: row.traffic,
            trafficValue:
              row.traffic_value,
            source: row.source,
            sourceUrl:
              row.source_url,
            picture: row.picture,
            pictureSource:
              row.picture_source,
            rank: row.trend_rank,
            score: row.trend_score,
            updatedAt:
              row.updated_at,
          })
        ),
      });
    }

    /*
     * =========================================================
     * 2. NORMALISASI GOOGLE TRENDS
     * =========================================================
     */

    const normalizedItems =
      items
        .map((item, index) => {
          const keyword = cleanText(
            item.query ||
              item.normalized_query
          );

          if (!keyword) {
            return null;
          }

          const rank =
            Number(item.position) ||
            Number(item.raw_position) ||
            index + 1;

          const trafficValue =
            parseTrafficValue(
              item.search_volume,
              0
            );

          const traffic =
            cleanText(
              item.search_volume_label
            ) ||
            (trafficValue > 0
              ? `${trafficValue}+`
              : null);

          const increasePercentage =
            Number(
              item.increase_percentage
            ) || 0;

          const title = keyword;

          const category =
            getCategory(
              title,
              keyword,
              item.categories
            );

          const score =
            calculateTrendScore({
              trafficValue,
              increasePercentage,
              rank,
              startedAt:
                item.started_at,
              startTimestamp:
                item.start_timestamp,
            });

          return {
            keyword,
            title,
            category,
            traffic,
            trafficValue,
            rank,
            score,
            increasePercentage,
            sourceUrl:
              item.explore_url ||
              `https://trends.google.com/trends/explore?date=now+1-d&geo=ID&q=${encodeURIComponent(
                keyword
              )}`,
          };
        })
        .filter(Boolean) as Array<{
        keyword: string;
        title: string;
        category: string;
        traffic: string | null;
        trafficValue: number;
        rank: number;
        score: number;
        increasePercentage: number;
        sourceUrl: string;
      }>;

    if (!normalizedItems.length) {
      throw new Error(
        "Google Trends tidak menghasilkan trend yang valid."
      );
    }

    /*
     * =========================================================
     * 3. AMBIL TREND LAMA
     * =========================================================
     */

    const keywords =
      normalizedItems.map(
        (item) => item.keyword
      );

    const {
      data: existingData,
      error: existingError,
    } = await supabaseServer
      .from("trends")
      .select(
        `
        id,
        keyword,
        title,
        category,
        traffic,
        traffic_value,
        source,
        source_url,
        picture,
        picture_source,
        trend_rank,
        trend_score,
        created_at,
        updated_at
        `
      )
      .in("keyword", keywords);

    if (existingError) {
      throw existingError;
    }

    const existingRows =
      (existingData || []) as TrendRow[];

    const existingByKeyword =
      new Map(
        existingRows.map(
          (row) => [
            row.keyword.toLowerCase(),
            row,
          ]
        )
      );

    /*
     * =========================================================
     * 4. AMBIL SNAPSHOT TERAKHIR
     * =========================================================
     */

    const existingTrendIds =
      existingRows.map(
        (row) => row.id
      );

    let previousSnapshots:
      SnapshotRow[] = [];

    if (existingTrendIds.length > 0) {
      const {
        data: snapshotData,
        error: snapshotError,
      } = await supabaseServer
        .from("trend_snapshots")
        .select(
          `
          id,
          trend_id,
          traffic,
          traffic_value,
          trend_rank,
          recorded_at
          `
        )
        .in(
          "trend_id",
          existingTrendIds
        )
        .order("recorded_at", {
          ascending: false,
        });

      if (snapshotError) {
        throw snapshotError;
      }

      const latestByTrend =
        new Map<
          string,
          SnapshotRow
        >();

      for (
        const snapshot of
          (snapshotData ||
            []) as SnapshotRow[]
      ) {
        if (
          !latestByTrend.has(
            snapshot.trend_id
          )
        ) {
          latestByTrend.set(
            snapshot.trend_id,
            snapshot
          );
        }
      }

      previousSnapshots =
        Array.from(
          latestByTrend.values()
        );
    }

    const previousSnapshotByTrendId =
      new Map(
        previousSnapshots.map(
          (snapshot) => [
            snapshot.trend_id,
            snapshot,
          ]
        )
      );

    /*
     * =========================================================
     * 5. UPSERT TREND
     * =========================================================
     */

    let inserted = 0;
    let updated = 0;

    const savedRows: TrendRow[] = [];

    for (
      const item of normalizedItems
    ) {
      const existing =
        existingByKeyword.get(
          item.keyword.toLowerCase()
        );

      const payload = {
        keyword: item.keyword,
        title: item.title,
        category: item.category,
        traffic: item.traffic,
        traffic_value:
          item.trafficValue,
        source,
        source_url:
          item.sourceUrl,
        trend_rank: item.rank,
        trend_score:
          item.score,
        updated_at:
          new Date().toISOString(),
      };

      if (existing) {
        const {
          data,
          error,
        } = await supabaseServer
          .from("trends")
          .update(payload)
          .eq("id", existing.id)
          .select(
            `
            id,
            keyword,
            title,
            category,
            traffic,
            traffic_value,
            source,
            source_url,
            picture,
            picture_source,
            trend_rank,
            trend_score,
            created_at,
            updated_at
            `
          )
          .single();

        if (error) {
          throw error;
        }

        savedRows.push(
          data as TrendRow
        );

        updated++;
      } else {
        const {
          data,
          error,
        } = await supabaseServer
          .from("trends")
          .insert(payload)
          .select(
            `
            id,
            keyword,
            title,
            category,
            traffic,
            traffic_value,
            source,
            source_url,
            picture,
            picture_source,
            trend_rank,
            trend_score,
            created_at,
            updated_at
            `
          )
          .single();

        if (error) {
          throw error;
        }

        savedRows.push(
          data as TrendRow
        );

        inserted++;
      }
    }

    /*
     * =========================================================
     * 6. BUAT MAP GOOGLE MOMENTUM
     * =========================================================
     */

    const googleMomentumByKeyword =
      new Map(
        normalizedItems.map(
          (item) => [
            item.keyword.toLowerCase(),
            item.increasePercentage,
          ]
        )
      );

    /*
     * =========================================================
     * 7. HITUNG NAIK TERCEPAT
     * =========================================================
     */

    const fastestRising:
      FastestRising[] = [];

    for (
      const row of savedRows
    ) {
      const previous =
        previousSnapshotByTrendId.get(
          row.id
        );

      const googleIncrease =
        googleMomentumByKeyword.get(
          row.keyword.toLowerCase()
        ) || 0;

      /*
       * Trend baru tidak punya snapshot lama.
       * Tetapi tetap bisa masuk Naik Tercepat
       * jika Google memberikan momentum yang kuat.
       */

      const previousTrafficValue =
        previous?.traffic_value || 0;

      const currentTrafficValue =
        Number(
          row.traffic_value || 0
        );

      const snapshotGrowth =
        previous
          ? calculateTrafficGrowth(
              currentTrafficValue,
              previousTrafficValue
            )
          : 0;

      const previousRank =
        previous?.trend_rank ||
        row.trend_rank;

      const rankChange =
        previous
          ? calculateRankChange(
              previousRank,
              row.trend_rank
            )
          : 0;

      /*
       * Minimal momentum:
       *
       * - Google increase > 0
       * ATAU
       * - traffic RAMAIHARI naik
       * ATAU
       * - ranking naik
       */

      const hasMomentum =
        googleIncrease > 0 ||
        snapshotGrowth > 0 ||
        rankChange > 0;

      if (!hasMomentum) {
        continue;
      }

      const risingScore =
        calculateRisingScore({
          googleIncrease,
          snapshotGrowth,
          rankChange,
          trafficValue:
            currentTrafficValue,
        });

      fastestRising.push({
        id: row.id,
        keyword: row.keyword,
        title: row.title,
        category: row.category,
        currentTraffic:
          row.traffic,
        currentTrafficValue,
        previousTraffic:
          previous?.traffic || null,
        previousTrafficValue,
        growth: snapshotGrowth,
        googleIncrease,
        rank: row.trend_rank,
        previousRank,
        rankChange,
        score: risingScore,
      });
    }

    /*
     * =========================================================
     * PRIORITAS NAIK TERCEPAT
     * =========================================================
     *
     * Urutan:
     * 1. Rising score
     * 2. Momentum Google
     * 3. Growth snapshot
     * 4. Kenaikan ranking
     * 5. Rank sekarang
     *
     * Hanya 5 topik teratas yang ditampilkan.
     */

    fastestRising.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      if (
        b.googleIncrease !==
        a.googleIncrease
      ) {
        return (
          b.googleIncrease -
          a.googleIncrease
        );
      }

      if (b.growth !== a.growth) {
        return b.growth - a.growth;
      }

      if (
        b.rankChange !==
        a.rankChange
      ) {
        return (
          b.rankChange -
          a.rankChange
        );
      }

      return a.rank - b.rank;
    });

    const fastestRisingTop =
      fastestRising.slice(0, 5);

    /*
     * =========================================================
     * 8. SIMPAN SNAPSHOT BARU
     * =========================================================
     */

    let snapshotsCreated = 0;

    for (
      const row of savedRows
    ) {
      const {
        error,
      } = await supabaseServer
        .from("trend_snapshots")
        .insert({
          trend_id: row.id,
          traffic: row.traffic,
          traffic_value:
            row.traffic_value,
          trend_rank:
            row.trend_rank,
          recorded_at:
            new Date().toISOString(),
        });

      if (error) {
        throw error;
      }

      snapshotsCreated++;
    }

    /*
     * =========================================================
     * 9. RESPONSE
     * =========================================================
     */

    const trends =
      savedRows
        .sort(
          (a, b) =>
            a.trend_rank -
            b.trend_rank
        )
        .map((row) => ({
          id: row.id,
          keyword: row.keyword,
          title: row.title,
          category: row.category,
          traffic: row.traffic,
          trafficValue:
            row.traffic_value,
          source: row.source,
          sourceUrl:
            row.source_url,
          picture: row.picture,
          pictureSource:
            row.picture_source,
          rank: row.trend_rank,
          score: row.trend_score,
          updatedAt:
            row.updated_at,
        }));

    return NextResponse.json({
      success: true,
      source,
      country: "Indonesia",
      updatedAt:
        new Date().toISOString(),
      total: trends.length,
      fallback,
      database: {
        inserted,
        updated,
        snapshotsCreated,
        snapshotsSkipped: 0,
      },
      fastestRising:
        fastestRisingTop,
      trends,
    });
  } catch (error) {
    console.error(
      "Trends API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      }
    );
  }
}