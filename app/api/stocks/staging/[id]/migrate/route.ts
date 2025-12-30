import { NextRequest, NextResponse } from "next/server";
import { callProcedure } from "@/utils/db";

// POST: Migrate a staging stock to listed stocks
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Call the MigrateStagingStock procedure
    await callProcedure({
      procedureName: 'public."MigrateStagingStock"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [id], // p_stock_id
    });

    return NextResponse.json(
      {
        success: true,
        message: "Stock migrated to listed stocks successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error migrating staging stock:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to migrate stock",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
