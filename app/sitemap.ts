import type { MetadataRoute } from "next";

import { supabaseServer } from "@/lib/supabase-server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://ramaihari.com";

  const { data: trends } = await supabaseServer
    .from("trends")
    .select("keyword, updated_at")
    .order("updated_at", { ascending: false });

  const trendUrls: MetadataRoute.Sitemap =
    (trends ?? []).map((trend) => ({
      url: `${baseUrl}/trending/${encodeURIComponent(
        trend.keyword
      )}`,
      lastModified: trend.updated_at
        ? new Date(trend.updated_at)
        : new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...trendUrls,
  ];
}