
import { NextResponse } from "next/server";
import { fetchTrendingNow } from "google-trends-now";
import { supabaseServer } from "@/lib/supabase-server";

type TrendItem = {
  title?: string;
  keyword?: string;
  traffic?: string | number;
  trafficValue?: number;
  link?: string;
  picture?: string;
  source?: string;
};

type NewsData = {
  title: string | null;
  summary: string | null;
  source: string | null;
  url: string | null;
  publishedAt: string | null;
};

type TrendRow = {
  id: string;
  keyword: string;
  title: string;
  category: string;
  traffic: string;
  traffic_value: number;
  source: string | null;
  source_url: string | null;
  picture: string | null;
  picture_source: string | null;
  trend_rank: number;
  trend_score: number;
  news_title: string | null;
  news_summary: string | null;
  news_source: string | null;
  news_url: string | null;
  news_published_at: string | null;
};

type SnapshotRow = {
  trend_id: string;
  traffic: string | null;
  traffic_value: number | null;
  trend_rank: number | null;
  recorded_at: string;
};

type FastestRising = {
  keyword: string;
  title: string;
  category: string;
  traffic: string;
  trafficValue: number;
  rank: number;
  score: number;
  growthPercent: number;
  risingScore: number;
};

function cleanText(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ");
}

function stripHtml(value: unknown): string {
  return cleanText(
    decodeHtmlEntities(
      String(value ?? "")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
    )
  );
}

function parseTrafficValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const text = cleanText(value);

  if (!text) {
    return 0;
  }

  const match = text.match(/[\d.,]+/);

  if (!match) {
    return 0;
  }

  const numberText = match[0].replace(/[^\d]/g, "");
  const parsed = Number(numberText);

  return Number.isFinite(parsed) ? parsed : 0;
}

function trafficScore(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1000000) return 100;
  if (value >= 500000) return 90;
  if (value >= 100000) return 80;
  if (value >= 50000) return 70;
  if (value >= 10000) return 60;
  if (value >= 5000) return 50;
  if (value >= 1000) return 40;
  if (value >= 500) return 30;
  if (value >= 100) return 20;
  return 10;
}

function momentumScore(
  currentValue: number,
  previousValue: number
): number {
  if (previousValue <= 0) {
    return currentValue > 0 ? 100 : 0;
  }

  const growth =
    ((currentValue - previousValue) / previousValue) * 100;

  if (growth >= 500) return 100;
  if (growth >= 300) return 95;
  if (growth >= 200) return 90;
  if (growth >= 100) return 80;
  if (growth >= 50) return 70;
  if (growth >= 25) return 60;
  if (growth >= 10) return 50;
  if (growth > 0) return 40;
  if (growth === 0) return 25;

  return 10;
}

function rankingScore(rank: number): number {
  if (rank <= 1) return 100;
  if (rank <= 2) return 95;
  if (rank <= 3) return 90;
  if (rank <= 5) return 80;
  if (rank <= 10) return 70;
  if (rank <= 20) return 60;

  return 50;
}

function recencyScore(dateValue: unknown): number {
  if (!dateValue) {
    return 0;
  }

  const timestamp = new Date(String(dateValue)).getTime();

  if (!Number.isFinite(timestamp)) {
    return 0;
  }

  const ageHours =
    (Date.now() - timestamp) / (1000 * 60 * 60);

  if (ageHours <= 1) return 100;
  if (ageHours <= 3) return 90;
  if (ageHours <= 6) return 80;
  if (ageHours <= 12) return 70;
  if (ageHours <= 24) return 60;
  if (ageHours <= 48) return 40;

  return 20;
}

function calculateTrendScore(
  trafficValue: number,
  previousTrafficValue: number,
  rank: number,
  createdAt: string | null
): number {
  const traffic = trafficScore(trafficValue);

  const momentum = momentumScore(
    trafficValue,
    previousTrafficValue
  );

  const ranking = rankingScore(rank);
  const recency = recencyScore(createdAt);

  const score =
    traffic * 0.35 +
    momentum * 0.35 +
    ranking * 0.2 +
    recency * 0.1;

  return Math.round(score * 100) / 100;
}

function getCategory(
  title: string,
  keyword: string
): string {
  const text = `${title} ${keyword}`.toLowerCase();

  if (
    /bola|football|soccer|liga|league|piala|match|vs |fc |fifa|nba|basket|tennis|badminton|motogp|formula|f1|olahraga|real madrid|barcelona|liverpool|betis|ipswich/.test(
      text
    )
  ) {
    return "Olahraga";
  }

  if (
    /game|gaming|gamer|playstation|xbox|nintendo|steam|mobile legends|mlbb|free fire|pubg|valorant|minecraft/.test(
      text
    )
  ) {
    return "Gaming";
  }

  if (
    /film|movie|musik|music|artis|seleb|celebrity|entertainment|hiburan|konser|drama|series|tv|tiktok|youtube|instagram/.test(
      text
    )
  ) {
    return "Hiburan";
  }

  return "Berita";
}

async function getGoogleTrends(): Promise<TrendItem[]> {
  try {
    console.log("Fetching Google Trends...");

    const result = await fetchTrendingNow({
      geo: "ID",
      hours: 24,
      sort: "volume",
      limit: 10,
      fallback: "rss",
      timeoutMs: 20000,
    });

    console.log("Google Trends raw result:", result);

    if (!result || typeof result !== "object") {
      console.error(
        "Google Trends returned invalid result:",
        result
      );

      return [];
    }

    const resultObject = result as {
      items?: unknown;
      source?: string;
      fetch_status?: string;
      error?: unknown;
    };

    console.log(
      "Google Trends source:",
      resultObject.source
    );

    console.log(
      "Google Trends fetch_status:",
      resultObject.fetch_status
    );

    if (resultObject.error) {
      console.error(
        "Google Trends result error:",
        resultObject.error
      );
    }

    if (!Array.isArray(resultObject.items)) {
      console.error(
        "Google Trends items is not an array:",
        resultObject.items
      );

      return [];
    }

    console.log(
      `Google Trends returned ${resultObject.items.length} items`
    );

    const mappedItems: TrendItem[] =
      resultObject.items.map(
        (item: any) => ({
          title: cleanText(
            item?.query ??
              item?.normalized_query ??
              ""
          ),
          keyword: cleanText(
            item?.normalized_query ??
              item?.query ??
              ""
          ),
          traffic: cleanText(
            item?.search_volume_label ??
              item?.search_volume ??
              ""
          ),
          trafficValue: Number(
            item?.search_volume ?? 0
          ),
          link:
            item?.explore_url ??
            undefined,
          picture: undefined,
          source:
            item?.source ??
            "Google Trends",
        })
      );

    return mappedItems;
  } catch (error) {
    console.error(
      "Google Trends FULL ERROR:",
      error
    );

    return [];
  }
}

function extractXmlValue(
  xml: string,
  tag: string
): string {
  const regex = new RegExp(
    `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,
    "i"
  );

  const match = xml.match(regex);

  return match?.[1]?.trim() ?? "";
}

function extractXmlAttribute(
  xml: string,
  tag: string,
  attribute: string
): string {
  const regex = new RegExp(
    `<${tag}\\b[^>]*\\b${attribute}=["']([^"']+)["'][^>]*>`,
    "i"
  );

  const match = xml.match(regex);

  return match?.[1]
    ? decodeHtmlEntities(match[1]).trim()
    : "";
}

function extractAllXmlItems(
  xml: string
): string[] {
  return [
    ...xml.matchAll(
      /<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi
    ),
  ].map((match) => match[1]);
}

function isValidHttpUrl(
  value: string
): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function isGoogleNewsUrl(
  value: string
): boolean {
  try {
    const url = new URL(value);

    return (
      url.hostname === "news.google.com" ||
      url.hostname.endsWith(".news.google.com")
    );
  } catch {
    return false;
  }
}

function extractNewsHeadline(
  rssTitle: string
): string | null {
  const cleaned = stripHtml(rssTitle);

  if (!cleaned) {
    return null;
  }

  const withoutPublisher =
    cleaned.replace(
      /\s+-\s+[^-]+$/,
      ""
    );

  return (
    withoutPublisher.trim() ||
    cleaned
  );
}

function isGenericGoogleNewsSummary(
  value: string | null
): boolean {
  if (!value) {
    return true;
  }

  const normalized =
    cleanText(value).toLowerCase();

  return (
    normalized.includes(
      "comprehensive, up-to-date news coverage"
    ) ||
    normalized.includes(
      "aggregated from sources all over the world by google news"
    ) ||
    normalized.includes("google news")
  );
}

function extractMetaContent(
  html: string,
  attribute: "property" | "name",
  value: string
): string | null {
  const escapedValue =
    value.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

  const regex = new RegExp(
    `<meta\\b(?=[^>]*\\b${attribute}=["']${escapedValue}["'])[^>]*\\bcontent=["']([^"]*)["'][^>]*>`,
    "i"
  );

  const reverseRegex = new RegExp(
    `<meta\\b(?=[^>]*\\bcontent=["']([^"]*)["'])[^>]*\\b${attribute}=["']${escapedValue}["'][^>]*>`,
    "i"
  );

  const match = html.match(regex);

  if (match?.[1]) {
    const cleaned = stripHtml(match[1]);

    if (cleaned) {
      return cleaned.slice(0, 500);
    }
  }

  const reverseMatch =
    html.match(reverseRegex);

  if (reverseMatch?.[1]) {
    const cleaned =
      stripHtml(reverseMatch[1]);

    if (cleaned) {
      return cleaned.slice(0, 500);
    }
  }

  return null;
}

function extractCanonicalUrl(
  html: string
): string | null {
  const regex =
    /<link\b[^>]*\brel=["'][^"']*\bcanonical\b[^"']*["'][^>]*\bhref=["']([^"']+)["'][^>]*>/i;

  const reverseRegex =
    /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["'][^"']*\bcanonical\b[^"']*["'][^>]*>/i;

  const match =
    html.match(regex) ??
    html.match(reverseRegex);

  if (!match?.[1]) {
    return null;
  }

  const url =
    decodeHtmlEntities(
      match[1]
    ).trim();

  return isValidHttpUrl(url)
    ? url
    : null;
}

/* =====================================================
   GOOGLE NEWS URL RESOLVER
   ===================================================== */

function extractGoogleNewsArticleId(
  googleNewsUrl: string
): string | null {
  try {
    const parsed =
      new URL(googleNewsUrl);

    if (
      parsed.hostname !==
        "news.google.com" &&
      !parsed.hostname.endsWith(
        ".news.google.com"
      )
    ) {
      return null;
    }

    const parts =
      parsed.pathname
        .split("/")
        .filter(Boolean);

    const articleIndex =
      parts.lastIndexOf(
        "articles"
      );

    if (
      articleIndex === -1 ||
      !parts[articleIndex + 1]
    ) {
      return null;
    }

    return parts[
      articleIndex + 1
    ];
  } catch {
    return null;
  }
}

function extractGoogleNewsToken(
  googleNewsUrl: string
): string | null {
  return extractGoogleNewsArticleId(
    googleNewsUrl
  );
}

function tryDecodeLegacyGoogleNewsUrl(
  googleNewsUrl: string
): string | null {
  try {
    const token =
      extractGoogleNewsToken(
        googleNewsUrl
      );

    if (!token) {
      return null;
    }

    const normalized =
      token
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const padded =
      normalized +
      "=".repeat(
        (4 -
          (normalized.length % 4)) %
          4
      );

    const decoded =
      Buffer.from(
        padded,
        "base64"
      ).toString(
        "latin1"
      );

    const httpIndex =
      decoded.search(
        /https?:\/\/ /i
      );

    if (httpIndex === -1) {
      return null;
    }

    const possibleUrl =
      decoded
        .slice(httpIndex)
        .split("\u0000")[0]
        .trim();

    if (
      isValidHttpUrl(
        possibleUrl
      ) &&
      !isGoogleNewsUrl(
        possibleUrl
      )
    ) {
      return possibleUrl;
    }

    return null;
  } catch (error) {
    console.error(
      "Legacy Google News decode error:",
      error
    );

    return null;
  }
}

/**
 * Resolver pertama:
 * buka URL Google News dan lihat apakah
 * Google melakukan redirect langsung ke publisher.
 */
async function resolveNewsRedirect(
  newsUrl: string
): Promise<string | null> {
  try {
    if (
      !isValidHttpUrl(newsUrl) ||
      !isGoogleNewsUrl(newsUrl)
    ) {
      return null;
    }

    const response =
      await fetch(
        newsUrl,
        {
          headers: {
            Accept:
              "text/html,application/xhtml+xml",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
          },
          cache: "no-store",
          redirect: "follow",
          signal:
            AbortSignal.timeout(
              8000
            ),
        }
      );

    const finalUrl =
      response.url;

    if (
      isValidHttpUrl(finalUrl) &&
      !isGoogleNewsUrl(finalUrl)
    ) {
      return finalUrl;
    }

    return null;
  } catch (error) {
    console.error(
      "Google News redirect resolver error:",
      error
    );

    return null;
  }
}

/**
 * Decode string yang dikembalikan Google
 * seperti:
 *
 * https:\/\/example.com\/article
 * https:\u002F\u002Fexample.com
 */
function decodeGoogleEscapedUrl(
  value: string
): string | null {
  try {
    let decoded = value;

    decoded =
      decoded
        .replace(/\\u003d/gi, "=")
        .replace(/\\u0026/gi, "&")
        .replace(/\\u003f/gi, "?")
        .replace(/\\u002F/gi, "/")
        .replace(/\\u002f/gi, "/")
        .replace(/\\\//g, "/");

    try {
      decoded = JSON.parse(
        `"${decoded.replace(
          /"/g,
          '\\"'
        )}"`
      );
    } catch {
      // Biarkan hasil sebelumnya.
    }

    decoded =
      decodeHtmlEntities(
        decoded
      ).trim();

    try {
      decoded =
        decodeURIComponent(
          decoded
        );
    } catch {
      // URL sudah cukup decoded.
    }

    return isValidHttpUrl(decoded)
      ? decoded
      : null;
  } catch {
    return null;
  }
}

/**
 * Ambil data-p milik c-wiz dari halaman
 * Google News.
 *
 * Google dapat memiliki beberapa c-wiz[data-p].
 * Yang dibutuhkan adalah data-p yang berisi
 * garturlreq.
 *
 * Fallback:
 * Google juga dapat menyediakan token
 * melalui data-n-a-id, data-n-a-ts,
 * dan data-n-a-sg.
 */
function extractGoogleNewsDataP(
  html: string
): string | null {
  const matches = [
    ...html.matchAll(
      /<c-wiz\b[^>]*\bdata-p=(["'])([\s\S]*?)\1[^>]*>/gi
    ),
  ];

  for (const match of matches) {
    if (!match?.[2]) {
      continue;
    }

    const dataP =
      decodeHtmlEntities(
        match[2]
      );

    if (
      dataP.includes(
        "garturlreq"
      )
    ) {
      return dataP;
    }
  }

  const idMatch = html.match(
    /data-n-a-id=["']([^"']+)["']/i
  );

  const tsMatch = html.match(
    /data-n-a-ts=["']([^"']+)["']/i
  );

  const sgMatch = html.match(
    /data-n-a-sg=["']([^"']+)["']/i
  );

  if (
    idMatch?.[1] &&
    tsMatch?.[1] &&
    sgMatch?.[1]
  ) {
    return JSON.stringify([
      "garturlreq",
      [
        idMatch[1],
        tsMatch[1],
        sgMatch[1],
      ],
    ]);
  }

  return null;
}

/**
 * Ambil URL publisher dari response
 * Fbv4je Google News.
 *
 * Google mengembalikan nested JSON.
 */
function extractPublisherUrlFromRpc(
  responseText: string
): string | null {
  function findUrl(
    value: unknown
  ): string | null {
    if (typeof value === "string") {
      const direct =
        decodeGoogleEscapedUrl(
          value
        );

      if (
        direct &&
        !isGoogleNewsUrl(direct)
      ) {
        return direct;
      }

      const urlMatches =
        value.match(
          /https?:\\?\/\\?\/[^"'\\\s\]} }]+/gi
        ) ?? [];

      for (const raw of urlMatches) {
        const candidate =
          decodeGoogleEscapedUrl(
            raw.replace(
              /["'\\\]\}],+$/,
              ""
            )
          );

        if (
          candidate &&
          !isGoogleNewsUrl(candidate)
        ) {
          return candidate;
        }
      }

      const trimmed =
        value.trim();

      if (
        (trimmed.startsWith("[") ||
          trimmed.startsWith("{")) &&
        (
          trimmed.includes(
            "garturlres"
          ) ||
          trimmed.includes(
            "http"
          )
        )
      ) {
        try {
          const nested =
            JSON.parse(
              trimmed
            );

          const nestedResult =
            findUrl(nested);

          if (nestedResult) {
            return nestedResult;
          }
        } catch {
          // Bukan JSON valid.
        }
      }

      return null;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const result =
          findUrl(item);

        if (result) {
          return result;
        }
      }

      return null;
    }

    if (
      value &&
      typeof value === "object"
    ) {
      for (const item of Object.values(
        value as Record<
          string,
          unknown
        >
      )) {
        const result =
          findUrl(item);

        if (result) {
          return result;
        }
      }
    }

    return null;
  }

  const cleaned =
    responseText.replace(
      /^\)\]\}'\s*/,
      ""
    );

  try {
    const parsed =
      JSON.parse(cleaned);

    const result =
      findUrl(parsed);

    if (result) {
      return result;
    }
  } catch {
    // Fallback regex di bawah.
  }

  const patterns = [
    /garturlres[^"]*"((?:https?:\\?\/\\?\/)[^"\\\s]+)/i,
    /\["garturlres"\s*,\s*"((?:https?:\\?\/\\?\/)[^"]+)"/i,
    /\\"garturlres\\"\s*,\s*\\"((?:https?:\\?\/\\?\/)[^"\\]+)/i,
  ];

  for (const pattern of patterns) {
    const match =
      responseText.match(
        pattern
      );

    if (!match?.[1]) {
      continue;
    }

    const candidate =
      decodeGoogleEscapedUrl(
        match[1]
      );

    if (
      candidate &&
      !isGoogleNewsUrl(candidate)
    ) {
      return candidate;
    }
  }

  return null;
}

/**
 * Resolver kedua:
 *
 * 1. GET halaman artikel Google News.
 * 2. Ambil c-wiz[data-p].
 * 3. Bangun payload garturlreq berdasarkan
 *    data Google sendiri.
 * 4. POST ke Fbv4je.
 * 5. Ambil garturlres.
 */
async function resolveGoogleNewsUrl(
  googleNewsUrl: string
): Promise<string | null> {
  try {
    if (!isGoogleNewsUrl(googleNewsUrl)) {
      return isValidHttpUrl(googleNewsUrl)
        ? googleNewsUrl
        : null;
    }

    /**
     * Resolver legacy tetap dipakai
     * sebagai fallback pertama.
     */
    const legacyUrl =
      tryDecodeLegacyGoogleNewsUrl(
        googleNewsUrl
      );

    if (
      legacyUrl &&
      !isGoogleNewsUrl(legacyUrl)
    ) {
      return legacyUrl;
    }

    /**
     * STEP 1
     * Buka halaman Google News.
     */
    const articleResponse =
      await fetch(
        googleNewsUrl,
        {
          headers: {
            Accept:
              "text/html,application/xhtml+xml",
            "Accept-Language":
              "id-ID,id;q=0.9,en;q=0.8",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          },
          cache: "no-store",
          redirect: "follow",
          signal:
            AbortSignal.timeout(
              10000
            ),
        }
      );

    if (!articleResponse.ok) {
      return null;
    }

    /**
     * Kalau Google benar-benar redirect
     * langsung ke publisher.
     */
    const redirectedUrl =
      articleResponse.url;

    if (
      isValidHttpUrl(
        redirectedUrl
      ) &&
      !isGoogleNewsUrl(
        redirectedUrl
      )
    ) {
      return redirectedUrl;
    }

    const articleHtml =
      await articleResponse.text();

    if (!articleHtml) {
      return null;
    }

    /**
     * STEP 2
     * Ambil data-p dari c-wiz.
     */
    const dataP =
      extractGoogleNewsDataP(
        articleHtml
      );

    console.log(
      "GOOGLE NEWS DATA P:",
      Boolean(dataP),
      dataP?.slice(0, 500)
    );

    if (!dataP) {
      /**
       * Sebagai fallback, cek canonical.
       * Hanya diterima kalau canonical bukan
       * Google News.
       */
      const canonical =
        extractCanonicalUrl(
          articleHtml
        );

      if (
        canonical &&
        !isGoogleNewsUrl(
          canonical
        )
      ) {
        return canonical;
      }

      return null;
    }

    /**
     * STEP 3
     *
     * data-p Google biasanya berbentuk:
     *
     * %.@.["garturlreq", ...]
     */
    let parsedDataP: unknown;

    try {
      const normalizedDataP =
        dataP.replace(
          "%.@.",
          '["garturlreq",'
        );

      parsedDataP =
        JSON.parse(
          normalizedDataP
        );
    } catch (error) {
      console.error(
        "Google News data-p JSON parse error:",
        error
      );

      return null;
    }

    if (
      !Array.isArray(parsedDataP)
    ) {
      return null;
    }

    /**
     * Struktur RPC Google saat ini mengambil
     * bagian awal dan dua elemen terakhir
     * dari data-p.
     */
    if (
      parsedDataP.length < 8
    ) {
      return null;
    }

    const rpcPayload = [
      ...parsedDataP.slice(
        0,
        -6
      ),
      ...parsedDataP.slice(
        -2
      ),
    ];

    /**
     * STEP 4
     * Bentuk request Fbv4je.
     *
     * PENTING:
     * Elemen ketiga adalah string "null",
     * bukan JavaScript null.
     */
    const batchRequest = [
      [
        [
          "Fbv4je",
          JSON.stringify(
            rpcPayload
          ),
          "null",
          "generic",
        ],
      ],
    ];

    const requestBody =
      `f.req=${encodeURIComponent(
        JSON.stringify(
          batchRequest
        )
      )}`;

    /**
     * PENTING:
     * URL harus URL asli, bukan format Markdown.
     */
    const endpoint =   "https://news.google.com/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je";
      

    /**
     * STEP 5
     * Kirim ke Google.
     */
    let rpcResponse: Response;

    try {
      rpcResponse =
        await fetch(
          endpoint,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded;charset=UTF-8",
              Accept:
                "*/*",
              Referer:
                googleNewsUrl,
              Origin: "https://news.google.com",
                
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            },
            body:
              requestBody,
            cache:
              "no-store",
            redirect:
              "follow",
            signal:
              AbortSignal.timeout(
                10000
              ),
          }
        );

      console.log(
        "GOOGLE NEWS RPC STATUS:",
        rpcResponse.status,
        rpcResponse.ok
      );
    } catch (error) {
      console.error(
        "GOOGLE NEWS RPC FETCH ERROR:",
        error
      );

      return null;
    }

    if (!rpcResponse.ok) {
      console.error(
        "Google News RPC HTTP error:",
        rpcResponse.status
      );

      return null;
    }

    const responseText =
      await rpcResponse.text();

    console.log(
      "GOOGLE NEWS RPC RESPONSE:",
      responseText.slice(0, 3000)
    );

    if (!responseText) {
      return null;
    }

    /**
     * STEP 6
     * Cari garturlres.
     */
    const publisherUrl =
      extractPublisherUrlFromRpc(
        responseText
      );

    if (
      publisherUrl &&
      isValidHttpUrl(
        publisherUrl
      ) &&
      !isGoogleNewsUrl(
        publisherUrl
      )
    ) {
      return publisherUrl;
    }

    return null;
  } catch (error) {
    console.error(
      "Google News resolver error:",
      error
    );

    return null;
  }
}

/* =====================================================
   ARTICLE METADATA
   ===================================================== */

async function getArticleMetadata(
  articleUrl: string
): Promise<{
  url: string | null;
  title: string | null;
  summary: string | null;
}> {
  try {
    if (
      !isValidHttpUrl(
        articleUrl
      ) ||
      isGoogleNewsUrl(
        articleUrl
      )
    ) {
      return {
        url: null,
        title: null,
        summary: null,
      };
    }

    const response =
      await fetch(
        articleUrl,
        {
          headers: {
            Accept:
              "text/html,application/xhtml+xml",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",
          },
          cache: "no-store",
          redirect: "follow",
          signal:
            AbortSignal.timeout(
              8000
            ),
        }
      );

    if (!response.ok) {
      return {
        url: articleUrl,
        title: null,
        summary: null,
      };
    }

    const html =
      await response.text();

    if (!html) {
      return {
        url: articleUrl,
        title: null,
        summary: null,
      };
    }

    const finalUrl =
      response.url &&
      isValidHttpUrl(
        response.url
      ) &&
      !isGoogleNewsUrl(
        response.url
      )
        ? response.url
        : articleUrl;

    const canonicalUrl =
      extractCanonicalUrl(
        html
      );

    const title =
      extractMetaContent(
        html,
        "property",
        "og:title"
      ) ??
      extractMetaContent(
        html,
        "name",
        "twitter:title"
      );

    const summary =
      extractMetaContent(
        html,
        "property",
        "og:description"
      ) ??
      extractMetaContent(
        html,
        "name",
        "description"
      ) ??
      extractMetaContent(
        html,
        "name",
        "twitter:description"
      );

    return {
      url:
        canonicalUrl &&
        !isGoogleNewsUrl(
          canonicalUrl
        )
          ? canonicalUrl
          : finalUrl,
      title,
      summary:
        isGenericGoogleNewsSummary(
          summary
        )
          ? null
          : summary,
    };
  } catch (error) {
    console.error(
      "Article metadata error:",
      error
    );

    return {
      url: articleUrl,
      title: null,
      summary: null,
    };
  }
}

/* =====================================================
   RELATED NEWS
   ===================================================== */

async function getRelatedNews(
  keyword: string
): Promise<NewsData> {
  try {
    const rssUrl =
      `https://news.google.com/rss/search?q=${encodeURIComponent(
        keyword
      )}&hl=id&gl=ID&ceid=ID:id`;

    const response =
      await fetch(
        rssUrl,
        {
          headers: {
            Accept:
              "application/rss+xml, application/xml, text/xml",
            "User-Agent":
              "RAMAIHARI/1.0",
          },
          cache:
            "no-store",
          signal:
            AbortSignal.timeout(
              8000
            ),
        }
      );

    if (!response.ok) {
      console.error(
        "Google News RSS HTTP error:",
        response.status
      );

      return {
        title: null,
        summary: null,
        source: null,
        url: null,
        publishedAt: null,
      };
    }

    const xml =
      await response.text();

    const items =
      extractAllXmlItems(
        xml
      );

    if (
      items.length === 0
    ) {
      return {
        title: null,
        summary: null,
        source: null,
        url: null,
        publishedAt: null,
      };
    }

    const firstItem =
      items[0];

    const rawRssTitle =
      extractXmlValue(
        firstItem,
        "title"
      );

    const rssHeadline =
      extractNewsHeadline(
        rawRssTitle
      );

    const sourceElement =
      firstItem.match(
        /<source\b([^>]*)>([\s\S]*?)<\/source>/i
      );

    const source =
      sourceElement?.[2]
        ? stripHtml(
            sourceElement[2]
          )
        : null;

    const googleNewsLink =
      extractXmlValue(
        firstItem,
        "link"
      );

    const pubDate =
      extractXmlValue(
        firstItem,
        "pubDate"
      );

    let publishedAt:
      | string
      | null = null;

    if (pubDate) {
      const parsedDate =
        new Date(
          pubDate
        );

      if (
        Number.isFinite(
          parsedDate.getTime()
        )
      ) {
        publishedAt =
          parsedDate.toISOString();
      }
    }

    let publisherUrl:
      | string
      | null = null;

    if (
      googleNewsLink &&
      isGoogleNewsUrl(
        googleNewsLink
      )
    ) {
      /**
       * Resolver 1:
       * redirect biasa.
       */
      publisherUrl =
        await resolveNewsRedirect(
          googleNewsLink
        );

      /**
       * Resolver 2:
       * data-p + Fbv4je.
       */
      if (!publisherUrl) {
        publisherUrl =
          await resolveGoogleNewsUrl(
            googleNewsLink
          );
      }
    } else if (
      googleNewsLink &&
      isValidHttpUrl(
        googleNewsLink
      )
    ) {
      publisherUrl =
        googleNewsLink;
    }

    let articleTitle:
      | string
      | null = null;

    let articleSummary:
      | string
      | null = null;

    let finalArticleUrl:
      | string
      | null =
        publisherUrl;

    if (publisherUrl) {
      const metadata =
        await getArticleMetadata(
          publisherUrl
        );

      articleTitle =
        metadata.title;

      articleSummary =
        metadata.summary;

      finalArticleUrl =
        metadata.url ??
        publisherUrl;
    }

    const finalTitle =
      articleTitle ??
      rssHeadline;

    console.log(
      "News result:",
      {
        keyword,
        rssHeadline,
        title:
          finalTitle,
        source,
        googleNewsLink,
        publisherUrl:
          finalArticleUrl,
        hasSummary:
          Boolean(
            articleSummary
          ),
      }
    );

    return {
      title:
        finalTitle,
      summary:
        articleSummary,
      source,
      url:
        finalArticleUrl,
      publishedAt,
    };
  } catch (error) {
    console.error(
      "Google News RSS error:",
      error
    );

    return {
      title: null,
      summary: null,
      source: null,
      url: null,
      publishedAt: null,
    };
  }
}

/* =====================================================
   TRAFFIC / RANKING
   ===================================================== */

async function calculateTrafficGrowth(
  trendId: string,
  currentTrafficValue: number
): Promise<number> {
  const { data } =
    await supabaseServer
      .from(
        "trend_snapshots"
      )
      .select(
        "traffic_value, recorded_at"
      )
      .eq(
        "trend_id",
        trendId
      )
      .order(
        "recorded_at",
        {
          ascending: false,
        }
      )
      .limit(1);

  if (
    !data ||
    data.length === 0
  ) {
    return 0;
  }

  const previousValue =
    Number(
      data[0].traffic_value ??
        0
    );

  if (
    previousValue <= 0
  ) {
    return 0;
  }

  return (
    (
      (
        currentTrafficValue -
        previousValue
      ) /
      previousValue
    ) * 100
  );
}

async function calculateRankChange(
  trendId: string,
  currentRank: number
): Promise<number> {
  const { data } =
    await supabaseServer
      .from(
        "trend_snapshots"
      )
      .select(
        "trend_rank, recorded_at"
      )
      .eq(
        "trend_id",
        trendId
      )
      .order(
        "recorded_at",
        {
          ascending: false,
        }
      )
      .limit(1);

  if (
    !data ||
    data.length === 0
  ) {
    return 0;
  }

  const previousRank =
    Number(
      data[0].trend_rank ??
        currentRank
    );

  return (
    previousRank -
    currentRank
  );
}

async function calculateRisingScore(
  trendId: string,
  currentTrafficValue: number,
  currentRank: number
): Promise<{
  growthPercent: number;
  rankChange: number;
  risingScore: number;
}> {
  const growthPercent =
    await calculateTrafficGrowth(
      trendId,
      currentTrafficValue
    );

  const rankChange =
    await calculateRankChange(
      trendId,
      currentRank
    );

  const growthScore =
    Math.min(
      100,
      Math.max(
        0,
        growthPercent
      )
    );

  const rankScore =
    Math.min(
      100,
      Math.max(
        0,
        rankChange * 20
      )
    );

  const risingScore =
    Math.round(
      (
        growthScore * 0.7 +
        rankScore * 0.3
      ) * 100
    ) / 100;

  return {
    growthPercent:
      Math.round(
        growthPercent * 100
      ) / 100,
    rankChange,
    risingScore,
  };
}

/* =====================================================
   GET API
   ===================================================== */

export async function GET() {
  try {
    const googleTrends =
      await getGoogleTrends();

    const trendsSource:
      | "Google Trends"
      | "Supabase fallback" =
      googleTrends.length > 0
        ? "Google Trends"
        : "Supabase fallback";

    let rawTrends:
      | TrendItem[]
      | null =
      googleTrends.length > 0
        ? googleTrends
        : null;

    /* =================================================
       SUPABASE FALLBACK
       ================================================= */

    if (!rawTrends) {
      const {
        data,
        error,
      } =
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
              source,
              source_url,
              picture,
              picture_source,
              trend_rank,
              trend_score,
              news_title,
              news_summary,
              news_source,
              news_url,
              news_published_at
            `
          )
          .order(
            "trend_rank",
            {
              ascending: true,
            }
          )
          .limit(10);

      if (error) {
        throw error;
      }

      const fallbackTrends =
        (data ??
          []) as TrendRow[];

      const trends =
        fallbackTrends.map(
          (row) => ({
            id:
              row.id,
            keyword:
              row.keyword,
            title:
              row.title,
            category:
              row.category,
            traffic:
              row.traffic,
            trafficValue:
              Number(
                row.traffic_value ??
                  0
              ),
            source:
              row.source,
            sourceUrl:
              row.source_url,
            picture:
              row.picture,
            pictureSource:
              row.picture_source,
            rank:
              row.trend_rank,
            score:
              Number(
                row.trend_score ??
                  0
              ),
            newsTitle:
              row.news_title,
            newsSummary:
              row.news_summary,
            newsSource:
              row.news_source,
            newsUrl:
              row.news_url,
            newsPublishedAt:
              row.news_published_at,
          })
        );

      return NextResponse.json({
        success: true,
        source:
          trendsSource,
        country:
          "Indonesia",
        updatedAt:
          new Date().toISOString(),
        total:
          trends.length,
        fallback:
          true,
        database: {
          inserted: 0,
          updated: 0,
          snapshotsCreated: 0,
          snapshotsSkipped: 0,
        },
        fastestRising:
          [],
        trends,
      });
    }

    /* =================================================
       NORMALIZE GOOGLE TRENDS
       ================================================= */

    const normalized =
      rawTrends
        .map(
          (
            item,
            index
          ) => {
            const keyword =
              cleanText(
                item.keyword ??
                  item.title
              );

            const title =
              cleanText(
                item.title ??
                  item.keyword
              );

            const traffic =
              cleanText(
                item.traffic
              );

            const trafficValue =
              Number(
                item.trafficValue ??
                  parseTrafficValue(
                    item.traffic
                  )
              );

            return {
              keyword,
              title,
              traffic:
                traffic ||
                String(
                  trafficValue
                ),
              trafficValue:
                Number.isFinite(
                  trafficValue
                )
                  ? trafficValue
                  : 0,
              source:
                item.source ??
                null,
              sourceUrl:
                item.link ??
                null,
              picture:
                item.picture ??
                null,
              rank:
                index + 1,
            };
          }
        )
        .filter(
          (item) =>
            item.keyword.length >
            0
        )
        .slice(
          0,
          10
        );

    const keywords =
      normalized.map(
        (item) =>
          item.keyword
      );

    /* =================================================
       EXISTING DATABASE ROWS
       ================================================= */

    const {
      data: existingRows,
      error: existingError,
    } =
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
            source,
            source_url,
            picture,
            picture_source,
            trend_rank,
            trend_score,
            news_title,
            news_summary,
            news_source,
            news_url,
            news_published_at,
            created_at,
            updated_at
          `
        )
        .in(
          "keyword",
          keywords
        );

    if (existingError) {
      throw existingError;
    }

    const existingMap =
      new Map<
        string,
        TrendRow & {
          created_at?: string;
          updated_at?: string;
        }
      >();

    for (
      const row of
        existingRows ?? []
    ) {
      existingMap.set(
        row.keyword,
        row as TrendRow & {
          created_at?: string;
          updated_at?: string;
        }
      );
    }

    const now =
      new Date().toISOString();

    const preparedRows:
      Array<
        TrendRow & {
          created_at?: string;
          updated_at?: string;
        }
      > = [];

    let inserted = 0;
    let updated = 0;

    /* =================================================
       PREPARE DATABASE ROWS
       ================================================= */

    for (
      const item of
        normalized
    ) {
      const existing =
        existingMap.get(
          item.keyword
        );

      const previousTrafficValue =
        Number(
          existing?.traffic_value ??
            0
        );

      const category =
        existing?.category ??
        getCategory(
          item.title,
          item.keyword
        );

      const score =
        calculateTrendScore(
          item.trafficValue,
          previousTrafficValue,
          item.rank,
          now
        );

      const news =
        await getRelatedNews(
          item.keyword
        );

      const row = {
        id:
          existing?.id ??
          crypto.randomUUID(),

        keyword:
          item.keyword,

        title:
          item.title,

        category,

        traffic:
          item.traffic,

        traffic_value:
          item.trafficValue,

        source:
          item.source,

        source_url:
          item.sourceUrl,

        picture:
          item.picture,

        picture_source:
          existing?.picture_source ??
          null,

        trend_rank:
          item.rank,

        trend_score:
          score,

        news_title:
          news.title ??
          existing?.news_title ??
          null,

        news_summary:
          news.summary ??
          existing?.news_summary ??
          null,

        news_source:
          news.source ??
          existing?.news_source ??
          null,

        news_url:
          news.url ??
          existing?.news_url ??
          null,

        news_published_at:
          news.publishedAt ??
          existing?.news_published_at ??
          null,

        created_at:
          existing?.created_at ??
          now,

        updated_at:
          now,
      };

      preparedRows.push(
        row as TrendRow & {
          created_at?: string;
          updated_at?: string;
        }
      );

      if (existing) {
        updated++;
      } else {
        inserted++;
      }
    }

    /* =================================================
       UPSERT
       ================================================= */

    if (
      preparedRows.length >
      0
    ) {
      const {
        error:
          upsertError,
      } =
        await supabaseServer
          .from("trends")
          .upsert(
            preparedRows,
            {
              onConflict:
                "keyword",
            }
          );

      if (upsertError) {
        throw upsertError;
      }
    }

    /* =================================================
       READ SAVED ROWS
       ================================================= */

    const {
      data: savedRows,
      error: savedError,
    } =
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
            source,
            source_url,
            picture,
            picture_source,
            trend_rank,
            trend_score,
            news_title,
            news_summary,
            news_source,
            news_url,
            news_published_at
          `
        )
        .in(
          "keyword",
          keywords
        )
        .order(
          "trend_rank",
          {
            ascending: true,
          }
        );

    if (savedError) {
      throw savedError;
    }

    const savedTrendRows =
      (savedRows ??
        []) as TrendRow[];

    let snapshotsCreated =
      0;

    let snapshotsSkipped =
      0;

    const fastestRising:
      FastestRising[] = [];

    /* =================================================
       SNAPSHOTS + FASTEST RISING
       ================================================= */

    for (
      const row of
        savedTrendRows
    ) {
      const rising =
        await calculateRisingScore(
          row.id,
          Number(
            row.traffic_value ??
              0
          ),
          Number(
            row.trend_rank ??
              0
          )
        );

      if (
        rising.risingScore >
        0
      ) {
        fastestRising.push({
          keyword:
            row.keyword,
          title:
            row.title,
          category:
            row.category,
          traffic:
            row.traffic,
          trafficValue:
            Number(
              row.traffic_value ??
                0
            ),
          rank:
            row.trend_rank,
          score:
            Number(
              row.trend_score ??
                0
            ),
          growthPercent:
            rising.growthPercent,
          risingScore:
            rising.risingScore,
        });
      }

      const {
        data:
          latestSnapshot,
        error:
          latestSnapshotError,
      } =
        await supabaseServer
          .from(
            "trend_snapshots"
          )
          .select(
            "trend_id, traffic, traffic_value, trend_rank, recorded_at"
          )
          .eq(
            "trend_id",
            row.id
          )
          .order(
            "recorded_at",
            {
              ascending:
                false,
            }
          )
          .limit(1);

      if (
        latestSnapshotError
      ) {
        throw latestSnapshotError;
      }

      const latest =
        (
          latestSnapshot?.[0] ??
          null
        ) as SnapshotRow | null;

      const shouldInsert =
        !latest ||
        latest.traffic !==
          row.traffic ||
        Number(
          latest.traffic_value ??
            0
        ) !==
          Number(
            row.traffic_value ??
              0
          ) ||
        Number(
          latest.trend_rank ??
            0
        ) !==
          Number(
            row.trend_rank ??
              0
          );

      if (shouldInsert) {
        const {
          error:
            snapshotInsertError,
        } =
          await supabaseServer
            .from(
              "trend_snapshots"
            )
            .insert({
              trend_id:
                row.id,
              traffic:
                row.traffic,
              traffic_value:
                Number(
                  row.traffic_value ??
                    0
                ),
              trend_rank:
                row.trend_rank,
              recorded_at:
                now,
            });

        if (
          snapshotInsertError
        ) {
          throw snapshotInsertError;
        }

        snapshotsCreated++;
      } else {
        snapshotsSkipped++;
      }
    }

    fastestRising.sort(
      (a, b) =>
        b.risingScore -
        a.risingScore
    );

    /* =================================================
       FINAL RESPONSE
       ================================================= */

    const trends =
      savedTrendRows.map(
        (row) => ({
          id:
            row.id,
          keyword:
            row.keyword,
          title:
            row.title,
          category:
            row.category,
          traffic:
            row.traffic,
          trafficValue:
            Number(
              row.traffic_value ??
                0
            ),
          source:
            row.source,
          sourceUrl:
            row.source_url,
          picture:
            row.picture,
          pictureSource:
            row.picture_source,
          rank:
            row.trend_rank,
          score:
            Number(
              row.trend_score ??
                0
            ),
          newsTitle:
            row.news_title,
          newsSummary:
            row.news_summary,
          newsSource:
            row.news_source,
          newsUrl:
            row.news_url,
          newsPublishedAt:
            row.news_published_at,
        })
      );

    return NextResponse.json({
      success: true,
      source:
        trendsSource,
      country:
        "Indonesia",
      updatedAt:
        now,
      total:
        trends.length,
      fallback:
        false,
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
      "Trends API fatal error:",
      error
    );

    const errorObject =
      typeof error ===
        "object" &&
      error !== null
        ? error
        : {
            message:
              String(error),
          };

    return NextResponse.json(
      {
        success: false,
        error:
          errorObject,
      },
      {
        status: 500,
      }
    );
  }
}

