import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("products")
      .select(
        `
        id,
        name,
        slug,
        description,
        image_url,
        price,
        marketplace,
        product_url,
        related_keyword,
        product_score,
        updated_at
        `
      )
      .eq("is_active", true)
      .order("product_score", {
        ascending: false,
      })
      .limit(8);

    if (error) {
      console.error("Products API error:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Gagal mengambil data produk.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      total: data?.length || 0,
      products: data || [],
    });
  } catch (error) {
    console.error("Products API unexpected error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Terjadi kesalahan pada server.",
      },
      { status: 500 }
    );
  }
}