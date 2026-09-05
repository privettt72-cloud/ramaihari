import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type Trend = {
  keyword: string;
  title: string;
  category?: string | null;
  trend_score?: number | null;
};

type ProductMapping = {
  product_search_keyword: string;
  product_category: string;
};

function getProductMapping(
  keyword: string,
  title: string,
  category?: string | null
): ProductMapping | null {
  const keywordText = keyword.toLowerCase().trim();
  const titleText = title.toLowerCase().trim();

  // Gabungkan untuk mencari sinyal produk.
  const text = `${keywordText} ${titleText}`;

  // ==========================================
  // 1. SKIP: tren yang jelas bukan produk
  // ==========================================

  const skipKeywords = [
    "cuaca",
    "prakiraan",
    "hujan",
    "gempa",
    "banjir",
    "tsunami",
    "berita",
    "berita terbaru",
    "breaking news",
    "politik",
    "pemilu",
    "presiden",
    "menteri",
    "pemerintah",
    "ekonomi",
    "inflasi",
    "forex",
    "forex factory",
    "tradingview",
    "saham",
    "dolar",
    "rupiah",
    "emas",
    "treasury",
    "bunga bank",
  ];

  if (
    skipKeywords.some((item) =>
      keywordText.includes(item)
    )
  ) {
    return null;
  }

  // ==========================================
  // 2. TEKNOLOGI & ELEKTRONIK
  // ==========================================

  if (
    keywordText.includes("powerbank") ||
    keywordText.includes("power bank")
  ) {
    return {
      product_search_keyword: "powerbank",
      product_category: "Teknologi & Elektronik",
    };
  }

  if (
    keywordText.includes("earbuds") ||
    keywordText.includes("earbud")
  ) {
    return {
      product_search_keyword: "earbuds",
      product_category: "Teknologi & Elektronik",
    };
  }

  if (
    keywordText.includes("headset") ||
    keywordText.includes("headphone")
  ) {
    return {
      product_search_keyword: "headset",
      product_category: "Teknologi & Elektronik",
    };
  }

  if (
    keywordText.includes("charger") ||
    keywordText.includes("charging")
  ) {
    return {
      product_search_keyword: "charger",
      product_category: "Teknologi & Elektronik",
    };
  }

  if (
    keywordText.includes("iphone") ||
    keywordText.includes("ipad") ||
    keywordText.includes("android") ||
    keywordText.includes("smartphone") ||
    keywordText.includes("handphone")
  ) {
    return {
      product_search_keyword: "aksesori smartphone",
      product_category: "Teknologi & Elektronik",
    };
  }

  if (
    keywordText.includes("laptop") ||
    keywordText.includes("macbook")
  ) {
    return {
      product_search_keyword: "aksesori laptop",
      product_category: "Teknologi & Elektronik",
    };
  }

  if (
    keywordText.includes("keyboard") ||
    keywordText.includes("mouse") ||
    keywordText.includes("monitor")
  ) {
    return {
      product_search_keyword: "aksesori komputer",
      product_category: "Teknologi & Elektronik",
    };
  }

  if (
    keywordText.includes("kamera") ||
    keywordText.includes("camera")
  ) {
    return {
      product_search_keyword: "kamera",
      product_category: "Teknologi & Elektronik",
    };
  }

  // Gaming hanya jika keyword memang menyebut
  // gaming/game/perangkat gaming.
  if (
    keywordText.includes("gaming") ||
    keywordText.includes("playstation") ||
    keywordText.includes("xbox") ||
    keywordText.includes("nintendo") ||
    keywordText.includes("steam deck")
  ) {
    return {
      product_search_keyword: "aksesori gaming",
      product_category: "Komputer & Mobile Games",
    };
  }

  // ==========================================
  // 3. OLAHRAGA
  // ==========================================

  // Running / lari adalah sinyal produk yang kuat.
  if (
    keywordText === "running" ||
    keywordText.includes("running shoes") ||
    keywordText.includes("sepatu running") ||
    keywordText.includes("lari")
  ) {
    return {
      product_search_keyword: "sepatu running",
      product_category: "Olahraga & Outdoor",
    };
  }

  // Badminton
  if (
    keywordText.includes("badminton") ||
    keywordText.includes("bulu tangkis")
  ) {
    return {
      product_search_keyword: "raket badminton",
      product_category: "Olahraga & Outdoor",
    };
  }

  // Tennis
  if (keywordText.includes("tennis")) {
    return {
      product_search_keyword: "raket tennis",
      product_category: "Olahraga & Outdoor",
    };
  }

  // Sepak bola:
  // hanya aktif jika keyword memang menyebut pertandingan,
  // klub, liga, atau sepak bola.
  if (
    keywordText.includes("arsenal") ||
    keywordText.includes("chelsea") ||
    keywordText.includes("real madrid") ||
    keywordText.includes("madrid vs") ||
    keywordText.includes("barcelona") ||
    keywordText.includes("liverpool") ||
    keywordText.includes("manchester") ||
    keywordText.includes("psg") ||
    keywordText.includes("sepak bola") ||
    keywordText.includes("football") ||
    keywordText.includes("soccer") ||
    keywordText.includes("premier league")
  ) {
    return {
      product_search_keyword: "jersey sepak bola",
      product_category: "Olahraga & Outdoor",
    };
  }

  // Fitness / gym
  if (
    keywordText.includes("fitness") ||
    keywordText.includes("gym")
  ) {
    return {
      product_search_keyword: "perlengkapan fitness",
      product_category: "Olahraga & Outdoor",
    };
  }

  // JANGAN lagi menggunakan:
  // category === "Olahraga"
  //
  // Karena nama orang/stadion/berita olahraga
  // bisa masuk kategori Olahraga tetapi belum tentu
  // memiliki produk yang relevan.

  // ==========================================
  // 4. FASHION
  // ==========================================

  if (
    keywordText.includes("sneakers")
  ) {
    return {
      product_search_keyword: "sneakers",
      product_category: "Fashion",
    };
  }

  if (
    keywordText.includes("sepatu")
  ) {
    return {
      product_search_keyword: "sepatu",
      product_category: "Fashion",
    };
  }

  if (
    keywordText.includes("kaos") ||
    keywordText.includes("t-shirt")
  ) {
    return {
      product_search_keyword: "kaos",
      product_category: "Fashion",
    };
  }

  if (
    keywordText.includes("kemeja")
  ) {
    return {
      product_search_keyword: "kemeja",
      product_category: "Fashion",
    };
  }

  if (
    keywordText.includes("celana")
  ) {
    return {
      product_search_keyword: "celana",
      product_category: "Fashion",
    };
  }

  if (
    keywordText.includes("jaket")
  ) {
    return {
      product_search_keyword: "jaket",
      product_category: "Fashion",
    };
  }

  if (
    keywordText.includes("tas")
  ) {
    return {
      product_search_keyword: "tas",
      product_category: "Fashion",
    };
  }

  if (
    keywordText.includes("sandal")
  ) {
    return {
      product_search_keyword: "sandal",
      product_category: "Fashion",
    };
  }

  // ==========================================
  // 5. RUMAH & HIDUP
  // ==========================================

  if (
    keywordText.includes("tumbler") ||
    keywordText.includes("botol minum")
  ) {
    return {
      product_search_keyword: "tumbler",
      product_category: "Rumah & Hidup",
    };
  }

  if (
    keywordText.includes("peralatan dapur") ||
    keywordText.includes("dapur")
  ) {
    return {
      product_search_keyword: "peralatan dapur",
      product_category: "Rumah & Hidup",
    };
  }

  if (
    keywordText.includes("dekorasi rumah")
  ) {
    return {
      product_search_keyword: "dekorasi rumah",
      product_category: "Rumah & Hidup",
    };
  }

  // ==========================================
  // 6. JANGAN TEBAK
  // ==========================================
  //
  // Nama orang:
  // kobbie mainoo
  // tiger woods
  // wang zhiyi
  //
  // Tempat:
  // bali
  // indonesia
  // stadion si jalak harupat
  //
  // Pertandingan yang tidak memiliki sinyal produk:
  // genoa vs como
  //
  // Berita:
  // sam altman
  //
  // semuanya SKIP.

  return null;
}

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("trends")
      .select(
        `
        keyword,
        title,
        category,
        trend_score
        `
      )
      .order("trend_score", {
        ascending: false,
      })
      .limit(20);

    if (error) {
      console.error(
        "Product automation trends error:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error: "Gagal mengambil data trending.",
        },
        { status: 500 }
      );
    }

    const trends: Trend[] = data || [];

    const results = trends.map((trend) => {
      const mapping = getProductMapping(
        trend.keyword,
        trend.title,
        trend.category
      );

      return {
        trend_keyword: trend.keyword,
        trend_title: trend.title,
        category: trend.category || "Berita",
        trend_score: trend.trend_score || 0,

        product_search_keyword:
          mapping?.product_search_keyword || null,

        product_category:
          mapping?.product_category || null,

        status: mapping ? "READY" : "SKIP",
      };
    });

    const ready = results.filter(
      (item) => item.status === "READY"
    );

    const skipped = results.filter(
      (item) => item.status === "SKIP"
    );

    return NextResponse.json({
      success: true,
      total: results.length,
      ready: ready.length,
      skipped: skipped.length,
      ready_results: ready,
      skipped_results: skipped,
      results,
    });
  } catch (error) {
    console.error(
      "Product automation unexpected error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Terjadi kesalahan pada product automation.",
      },
      { status: 500 }
    );
  }
}