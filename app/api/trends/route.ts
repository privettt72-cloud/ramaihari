import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase-server";

type Trend = {
  id: string;
  rank: number;
  title: string;
  keyword: string;
  traffic: string;
  trafficValue: number;
  trendScore: number;
  category: string;
  newsTitle: string;
  newsUrl: string;
  newsSource: string;
  picture: string;
  pictureSource: string;
  trafficGrowth: number;
};

type FastestRising = {
  trendId: string;
  keyword: string;
  title: string;
  currentRank: number;
  previousRank: number;
  rankChange: number;
  trafficValue: number;
  previousTrafficValue: number;
  latestTrafficGrowth: number;
  bestTrafficGrowth: number;
  bestPreviousTraffic: number;
  bestCurrentTraffic: number;
  trafficGrowth: number;
  risingScore: number;
};

type SnapshotRow = {
  id?: number;
  trend_id: string;
  traffic: string | null;
  traffic_value: number | null;
  trend_rank: number | null;
  recorded_at: string;
};

type TrendRow = {
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

type TrendItem = {
  rank: number;
  title: string;
  keyword: string;
  traffic: string;
  trafficValue: number;
  newsTitle: string;
  newsUrl: string;
  newsSource: string;
  picture: string;
  pictureSource: string;
};

function cleanText(value: string) {
  return value
    .replace(/<!\[CDATA\[/gi, "")
    .replace(/\]\]>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function getTopLevelTitle(itemXml: string) {
  const match = itemXml.match(
    /^\s*<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/i
  );

  return cleanText(match?.[1] || "");
}

function getTagValue(itemXml: string, tagName: string) {
  const regex = new RegExp(
    `<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`,
    "i"
  );

  const match = itemXml.match(regex);

  return cleanText(match?.[1] || "");
}

function getTagAttribute(
  itemXml: string,
  tagName: string,
  attributeName: string
) {
  const regex = new RegExp(
    `<${tagName}\\b[^>]*\\s${attributeName}=["']([^"']+)["'][^>]*>`,
    "i"
  );

  const match = itemXml.match(regex);

  return cleanText(match?.[1] || "");
}

function parseTrafficValue(value: string) {
  const cleaned = cleanText(value)
    .replace(/\+/g, "")
    .replace(/,/g, "")
    .replace(/\./g, "");

  const match = cleaned.match(/\d+/);

  if (!match) {
    return 0;
  }

  return Number(match[0]);
}

function trafficScore(trafficValue: number) {
  if (trafficValue >= 50000) return 100;
  if (trafficValue >= 10000) return 95;
  if (trafficValue >= 5000) return 90;
  if (trafficValue >= 2000) return 85;
  if (trafficValue >= 1000) return 75;
  if (trafficValue >= 500) return 65;
  if (trafficValue >= 200) return 55;
  if (trafficValue >= 100) return 45;
  if (trafficValue > 0) return 30;

  return 0;
}

function momentumScore(growth: number) {
  if (growth >= 300) return 100;
  if (growth >= 200) return 90;
  if (growth >= 100) return 80;
  if (growth >= 50) return 70;
  if (growth >= 25) return 60;
  if (growth >= 10) return 50;
  if (growth > 0) return 30;

  return 0;
}

function rankingScore(rank: number) {
  if (rank === 1) return 100;
  if (rank === 2) return 95;
  if (rank === 3) return 90;
  if (rank === 4) return 85;
  if (rank === 5) return 80;
  if (rank === 6) return 70;
  if (rank === 7) return 60;
  if (rank === 8) return 50;
  if (rank === 9) return 40;
  if (rank === 10) return 30;

  return 0;
}

function recencyScore(createdAt: string) {
  const created = new Date(createdAt).getTime();

  if (!Number.isFinite(created)) {
    return 50;
  }

  const ageMinutes =
    (Date.now() - created) / (1000 * 60);

  if (ageMinutes <= 30) return 100;
  if (ageMinutes <= 60) return 85;
  if (ageMinutes <= 120) return 70;

  return 50;
}

function calculateTrendScore({
  trafficValue,
  trafficGrowth,
  rank,
  createdAt,
}: {
  trafficValue: number;
  trafficGrowth: number;
  rank: number;
  createdAt: string;
}) {
  const traffic = trafficScore(trafficValue);
  const momentum = momentumScore(trafficGrowth);
  const ranking = rankingScore(rank);
  const recency = recencyScore(createdAt);

  const score =
    traffic * 0.35 +
    momentum * 0.35 +
    ranking * 0.2 +
    recency * 0.1;

  return Math.round(score);
}

function getCategory(title: string, keyword = "") {
  const value =
    `${title} ${keyword}`.toLowerCase();

  const sportsKeywords = [
    "arsenal",
    "chelsea",
    "manchester",
    "liverpool",
    "barcelona",
    "real madrid",
    "madrid",
    "betis",
    "koln",
    "köln",
    "hoffenheim",
    "rodrygo",
    "football",
    "soccer",
    "sepak bola",
    "liga",
    "premier league",
    "champions league",
    "europa league",
    "nba",
    "nfl",
    "fifa",
    "badminton",
    "bulutangkis",
    "tennis",
    "basket",
    "voli",
    "olahraga",
    "athlete",
    "pertandingan",
    "china masters",
    "bwf",
    "world tour",
    "turnamen",
    "kejuaraan",
    "psg",
    "paris saint-germain",
    "monaco",
    "tiger woods",
    "golf",
    "f1",
    "motogp",
    "alcaraz",
    "sabalenka",
    "svitolina",
    "persija",
    "persib",
    "borneo fc",
    "borneo",
    "arema",
    "persebaya",
    "pss",
    "psis",
    "bali united",
    "dewa united",
    "barito",
    "madura united",
    "malut united",
    "semen padang",
    "persis",
    "persita",
    "psbs",
    "liga 1",
    "liga 2",
    "liga indonesia",
    "bri super league",
    "super league",
    "piala",
    "timnas",
    "tim nasional",
  ];

  const gamingKeywords = [
    "game",
    "gaming",
    "mobile legends",
    "mlbb",
    "free fire",
    "pubg",
    "minecraft",
    "roblox",
    "playstation",
    "xbox",
    "nintendo",
    "steam",
  ];

  const musicKeywords = [
    "song",
    "music",
    "musik",
    "album",
    "singer",
    "penyanyi",
    "konser",
    "concert",
    "band",
    "rapper",
    "rap",
    "spotify",
  ];

  const entertainmentKeywords = [
    "film",
    "movie",
    "series",
    "drama",
    "artis",
    "celebrity",
    "seleb",
    "actor",
    "actress",
    "aktor",
    "aktris",
    "netflix",
    "tv",
    "televisi",
    "cinema",
    "bioskop",
    "marvel",
    "spider-noir",
    "spider noir",
    "prime video",
  ];

  const technologyKeywords = [
    "iphone",
    "android",
    "samsung",
    "google",
    "apple",
    "microsoft",
    "technology",
    "teknologi",
    "ai",
    "artificial intelligence",
    "chatgpt",
    "openai",
    "software",
    "aplikasi",
    "app",
    "internet",
    "gadget",
    "smartphone",
  ];

  const newsKeywords = [
    "berita",
    "banjir",
    "gempa",
    "tsunami",
    "cuaca",
    "hujan",
    "angin",
    "badai",
    "kebakaran",
    "kecelakaan",
    "politik",
    "pemerintah",
    "presiden",
    "menteri",
    "dpr",
    "rupslb",
    "direktur",
    "ekonomi",
    "bisnis",
    "rupiah",
    "saham",
    "polisi",
    "hukum",
    "pengadilan",
    "hakim",
    "vonis",
    "kasus",
    "dinsos",
    "indonesia",
    "jakarta",
    "surabaya",
    "yogyakarta",
    "gempar",
  ];

  if (
    sportsKeywords.some((keyword) =>
      value.includes(keyword)
    )
  ) {
    return "Olahraga";
  }

  if (
    gamingKeywords.some((keyword) =>
      value.includes(keyword)
    )
  ) {
    return "Gaming";
  }

  if (
    musicKeywords.some((keyword) =>
      value.includes(keyword)
    )
  ) {
    return "Musik";
  }

  if (
    entertainmentKeywords.some((keyword) =>
      value.includes(keyword)
    )
  ) {
    return "Hiburan";
  }

  if (
    technologyKeywords.some((keyword) =>
      value.includes(keyword)
    )
  ) {
    return "Teknologi";
  }

  if (
    newsKeywords.some((keyword) =>
      value.includes(keyword)
    )
  ) {
    return "Berita";
  }

  return "Berita";
}

function calculateTrafficGrowth(
  currentTraffic: number,
  previousTraffic: number
) {
  if (previousTraffic <= 0) {
    return 0;
  }

  return Math.round(
    ((currentTraffic - previousTraffic) /
      previousTraffic) *
      100
  );
}

function calculateRisingScore({
  rankChange,
  trafficGrowth,
}: {
  rankChange: number;
  trafficGrowth: number;
}) {
  const rankScore = Math.max(
    0,
    Math.min(100, rankChange * 20)
  );

  const growthScore = Math.max(
    0,
    Math.min(100, trafficGrowth / 3)
  );

  return Math.round(
    rankScore * 0.5 +
      growthScore * 0.5
  );
}

export async function GET() {
  try {
    let items: TrendItem[] = [];
    let usingFallback = false;

    /*
     * ============================================================
     * 1. GOOGLE TRENDS
     * ============================================================
     */

    try {
      const controller =
        new AbortController();

      const timeout = setTimeout(() => {
        controller.abort();
      }, 8000);

      let response: Response;

      try {
        response = await fetch(
          "https://trends.google.com/trending/rss?geo=ID",
          {
            cache: "no-store",
            signal: controller.signal,
            headers: {
              Accept:
                "application/rss+xml, application/xml, text/xml",
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36",
            },
          }
        );
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        throw new Error(
          `Google Trends returned ${response.status}`
        );
      }

      const xml =
        await response.text();

      const itemMatches =
        xml.match(
          /<item\b[\s\S]*?<\/item>/gi
        );

      items = (itemMatches || [])
        .slice(0, 10)
        .map(
          (itemXml, index) => {
            const title =
              getTopLevelTitle(
                itemXml
              );

            const traffic =
              getTagValue(
                itemXml,
                "ht:approx_traffic"
              ) ||
              getTagValue(
                itemXml,
                "approx_traffic"
              );

            const trafficValue =
              parseTrafficValue(
                traffic
              );

            const newsTitle =
              getTagValue(
                itemXml,
                "ht:news_item_title"
              );

            const newsUrl =
              getTagValue(
                itemXml,
                "ht:news_item_url"
              );

            const newsSource =
              getTagValue(
                itemXml,
                "ht:news_item_source"
              );

            const picture =
              getTagValue(
                itemXml,
                "ht:picture"
              ) ||
              getTagAttribute(
                itemXml,
                "ht:picture",
                "url"
              );

            const pictureSource =
              getTagValue(
                itemXml,
                "ht:picture_source"
              );

            const keyword =
              title
                .trim()
                .toLowerCase();

            return {
              rank: index + 1,
              title,
              keyword,
              traffic,
              trafficValue,
              newsTitle,
              newsUrl,
              newsSource,
              picture,
              pictureSource,
            };
          }
        )
        .filter(
          (item) =>
            item.title &&
            item.keyword
        );

      if (items.length === 0) {
        throw new Error(
          "Tidak ada data trending dari Google Trends."
        );
      }
    } catch (googleError) {
      /*
       * ============================================================
       * 2. SUPABASE FALLBACK
       * ============================================================
       */

      console.error(
        "Google Trends unavailable, using Supabase fallback:",
        googleError
      );

      const {
        data: fallbackRows,
        error: fallbackError,
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
        .order(
          "trend_rank",
          {
            ascending: true,
          }
        )
        .limit(10);

      if (fallbackError) {
        throw fallbackError;
      }

      if (
        !fallbackRows ||
        fallbackRows.length === 0
      ) {
        throw new Error(
          "Google Trends tidak tersedia dan belum ada data fallback di Supabase."
        );
      }

      usingFallback = true;

      items = (
        fallbackRows as TrendRow[]
      )
        .map(
          (row, index) => {
            const title =
              row.title || "";

            const keyword =
              title
                .trim()
                .toLowerCase();

            return {
              rank: index + 1,
              title,
              keyword,
              traffic:
                row.traffic || "",
              trafficValue:
                Number(
                  row.traffic_value ||
                    0
                ),
              newsTitle: "",
              newsUrl:
                row.source_url || "",
              newsSource:
                row.source ||
                "",
              picture:
                row.picture || "",
              pictureSource:
                row.picture_source ||
                "",
            };
          }
        )
        .filter(
          (item) =>
            item.title &&
            item.keyword
        );
    }

    /*
     * ============================================================
     * 3. KEYWORDS
     * ============================================================
     */

    const currentKeywords =
      items.map(
        (item) => item.keyword
      );

    /*
     * ============================================================
     * 4. QUERY EXISTING DATA
     * ============================================================
     */

    const [
      existingResult,
      allExistingResult,
    ] = await Promise.all([
      supabaseServer
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
        .in(
          "keyword",
          currentKeywords
        ),

      supabaseServer
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
        ),
    ]);

    if (existingResult.error) {
      throw existingResult.error;
    }

    if (allExistingResult.error) {
      throw allExistingResult.error;
    }

    const existingRows =
      (existingResult.data ||
        []) as TrendRow[];

    const allExistingRows =
      (allExistingResult.data ||
        []) as TrendRow[];

    const existingByKeyword =
      new Map<string, TrendRow>();

    const existingByTitle =
      new Map<string, TrendRow>();

    for (const row of allExistingRows) {
      existingByKeyword.set(
        row.keyword
          .trim()
          .toLowerCase(),
        row
      );

      existingByTitle.set(
        row.title
          .trim()
          .toLowerCase(),
        row
      );
    }

    /*
     * ============================================================
     * 5. UPDATE / INSERT TRENDS
     * ============================================================
     */

    const currentTrendIds: string[] =
      [];

    let inserted = 0;
    let updated = 0;

    for (const item of items) {
      const existing =
        existingRows.find(
          (row) =>
            row.keyword
              .trim()
              .toLowerCase() ===
            item.keyword
        ) ||
        existingByKeyword.get(
          item.keyword
        ) ||
        existingByTitle.get(
          item.title
            .trim()
            .toLowerCase()
        );

      const previousTraffic =
        existing?.traffic_value || 0;

      const trafficGrowth =
        calculateTrafficGrowth(
          item.trafficValue,
          previousTraffic
        );

      const createdAt =
        existing?.created_at ||
        new Date().toISOString();

      const trendScore =
        calculateTrendScore({
          trafficValue:
            item.trafficValue,
          trafficGrowth,
          rank: item.rank,
          createdAt,
        });

      const payload = {
        keyword: item.keyword,
        title: item.title,
        category: getCategory(
          item.title,
          item.keyword
        ),
        traffic: item.traffic,
        traffic_value:
          item.trafficValue,
        source:
          usingFallback
            ? existing?.source ||
              "Google Trends"
            : "Google Trends",
        source_url:
          item.newsUrl ||
          existing?.source_url ||
          null,
        picture:
          item.picture ||
          existing?.picture ||
          null,
        picture_source:
          item.pictureSource ||
          existing?.picture_source ||
          null,
        trend_rank: item.rank,
        trend_score: trendScore,
        updated_at:
          new Date().toISOString(),
      };

      if (existing) {
        const { error } =
          await supabaseServer
            .from("trends")
            .update(payload)
            .eq(
              "id",
              existing.id
            );

        if (error) {
          throw error;
        }

        currentTrendIds.push(
          existing.id
        );

        updated++;
      } else {
        const { data, error } =
          await supabaseServer
            .from("trends")
            .insert(payload)
            .select("id")
            .single();

        if (error) {
          throw error;
        }

        currentTrendIds.push(
          data.id
        );

        inserted++;
      }
    }

    /*
     * ============================================================
     * 6. CURRENT TRENDS
     * ============================================================
     */

    const {
      data: currentRows,
      error: currentRowsError,
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
      .in(
        "id",
        currentTrendIds
      )
      .order(
        "trend_rank",
        {
          ascending: true,
        }
      );

    if (currentRowsError) {
      throw currentRowsError;
    }

    const currentTrendRows =
      (currentRows ||
        []) as TrendRow[];

    /*
     * ============================================================
     * 7. AMBIL SEMUA SNAPSHOT SEKALIGUS
     * ============================================================
     */

    const {
      data: snapshotRows,
      error: snapshotRowsError,
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
        currentTrendIds
      )
      .order(
        "recorded_at",
        {
          ascending: false,
        }
      );

    if (snapshotRowsError) {
      throw snapshotRowsError;
    }

    const snapshots =
      (snapshotRows ||
        []) as SnapshotRow[];

    const snapshotsByTrend =
      new Map<
        string,
        SnapshotRow[]
      >();

    for (const snapshot of snapshots) {
      const history =
        snapshotsByTrend.get(
          snapshot.trend_id
        ) || [];

      history.push(snapshot);

      snapshotsByTrend.set(
        snapshot.trend_id,
        history
      );
    }

    /*
     * ============================================================
     * 8. SNAPSHOT INSERT
     * ============================================================
     */

    let snapshotsCreated = 0;
    let snapshotsSkipped = 0;

    for (const row of currentTrendRows) {
      const currentItem =
        items.find(
          (item) =>
            item.keyword ===
            row.keyword
        );

      if (!currentItem) {
        continue;
      }

      const history =
        snapshotsByTrend.get(
          row.id
        ) || [];

      const latest =
        history[0];

      const currentTraffic =
        currentItem.trafficValue;

      const currentRank =
        currentItem.rank;

      const shouldCreateSnapshot =
        !latest ||
        Number(
          latest.traffic_value || 0
        ) !== currentTraffic ||
        Number(
          latest.trend_rank || 0
        ) !== currentRank;

      if (shouldCreateSnapshot) {
        const {
          data: insertedSnapshot,
          error:
            snapshotInsertError,
        } = await supabaseServer
          .from("trend_snapshots")
          .insert({
            trend_id: row.id,
            traffic:
              currentItem.traffic,
            traffic_value:
              currentTraffic,
            trend_rank:
              currentRank,
          })
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
          .single();

        if (snapshotInsertError) {
          throw snapshotInsertError;
        }

        const snapshot =
          insertedSnapshot as SnapshotRow;

        const updatedHistory =
          snapshotsByTrend.get(
            row.id
          ) || [];

        updatedHistory.unshift(
          snapshot
        );

        snapshotsByTrend.set(
          row.id,
          updatedHistory
        );

        snapshotsCreated++;
      } else {
        snapshotsSkipped++;
      }
    }

    /*
     * ============================================================
     * 9. FASTEST RISING
     * ============================================================
     */

    const fastestRising: FastestRising[] =
      [];

    for (const row of currentTrendRows) {
      const history =
        snapshotsByTrend.get(
          row.id
        ) || [];

      if (history.length < 2) {
        continue;
      }

      const latest =
        history[0];

      const previous =
        history[1];

      const currentTraffic =
        Number(
          latest.traffic_value ||
            0
        );

      const previousTraffic =
        Number(
          previous.traffic_value ||
            0
        );

      const currentRank =
        Number(
          latest.trend_rank || 0
        );

      const previousRank =
        Number(
          previous.trend_rank || 0
        );

      const latestTrafficGrowth =
        calculateTrafficGrowth(
          currentTraffic,
          previousTraffic
        );

      const rankChange =
        previousRank -
        currentRank;

      let bestTrafficGrowth =
        latestTrafficGrowth;

      let bestPreviousTraffic =
        previousTraffic;

      let bestCurrentTraffic =
        currentTraffic;

      for (
        let index = 0;
        index <
        history.length - 1;
        index++
      ) {
        const current =
          Number(
            history[index]
              .traffic_value ||
              0
          );

        const previousItem =
          Number(
            history[index + 1]
              .traffic_value ||
              0
          );

        const growth =
          calculateTrafficGrowth(
            current,
            previousItem
          );

        if (
          growth >
          bestTrafficGrowth
        ) {
          bestTrafficGrowth =
            growth;

          bestPreviousTraffic =
            previousItem;

          bestCurrentTraffic =
            current;
        }
      }

      const risingScore =
        calculateRisingScore({
          rankChange,
          trafficGrowth:
            latestTrafficGrowth,
        });

      fastestRising.push({
        trendId: row.id,
        keyword: row.keyword,
        title: row.title,
        currentRank,
        previousRank,
        rankChange,
        trafficValue:
          currentTraffic,
        previousTrafficValue:
          previousTraffic,
        latestTrafficGrowth,
        bestTrafficGrowth,
        bestPreviousTraffic,
        bestCurrentTraffic,
        trafficGrowth:
          latestTrafficGrowth,
        risingScore,
      });
    }

    fastestRising.sort(
      (a, b) =>
        b.risingScore -
        a.risingScore
    );

    /*
     * ============================================================
     * 10. NEWS MAP
     * ============================================================
     */

    const newsTitleMap =
      new Map<
        string,
        string
      >();

    const newsSourceMap =
      new Map<
        string,
        string
      >();

    for (const item of items) {
      if (item.newsTitle) {
        newsTitleMap.set(
          item.keyword,
          item.newsTitle
        );
      }

      if (item.newsSource) {
        newsSourceMap.set(
          item.keyword,
          item.newsSource
        );
      }
    }

    /*
     * ============================================================
     * 11. FINAL TRENDS
     * ============================================================
     */

    const trends: Trend[] =
      currentTrendRows.map(
        (row) => {
          const history =
            snapshotsByTrend.get(
              row.id
            ) || [];

          let trafficGrowth = 0;

          if (history.length >= 2) {
            trafficGrowth =
              calculateTrafficGrowth(
                Number(
                  history[0]
                    .traffic_value ||
                    0
                ),
                Number(
                  history[1]
                    .traffic_value ||
                    0
                )
              );
          }

          return {
            id: row.id,
            rank: Number(
              row.trend_rank || 0
            ),
            title: row.title,
            keyword: row.keyword,
            traffic:
              row.traffic || "",
            trafficValue:
              Number(
                row.traffic_value ||
                  0
              ),
            trendScore: Math.round(
              Number(
                row.trend_score || 0
              )
            ),
            category:
              row.category ||
              getCategory(
                row.title,
                row.keyword
              ),
            newsTitle:
              newsTitleMap.get(
                row.keyword
              ) || "",
            newsUrl:
              row.source_url || "",
            newsSource:
              newsSourceMap.get(
                row.keyword
              ) ||
              row.source ||
              "",
            picture:
              row.picture || "",
            pictureSource:
              row.picture_source ||
              "",
            trafficGrowth,
          };
        }
      );

    /*
     * ============================================================
     * 12. RESPONSE
     * ============================================================
     */

    return NextResponse.json({
      success: true,
      source: usingFallback
        ? "Supabase fallback"
        : "Google Trends",
      country: "Indonesia",
      updatedAt:
        new Date().toISOString(),
      total: trends.length,
      fallback: usingFallback,
      database: {
        inserted,
        updated,
        snapshotsCreated,
        snapshotsSkipped,
      },
      fastestRising:
        fastestRising.slice(
          0,
          5
        ),
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