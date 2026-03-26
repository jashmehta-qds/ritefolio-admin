import { NextResponse } from "next/server";
import { queryDB } from "@/utils/db";

interface TaxAssetClass {
  Id: number;
  Name: string;
  Description: string;
  IsActive: boolean;
  CreatedOn: number;
  UpdatedOn: number;
}

export async function GET() {
  try {
    const assets = await queryDB<TaxAssetClass>({
      query: `SELECT * FROM public."FetchTaxAssetClass"(NULL, true)`,
      dbName: process.env.PG_DEFAULT_DB,
    });

    return NextResponse.json(
      { success: true, data: assets },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching tax asset classes:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch tax asset classes",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
