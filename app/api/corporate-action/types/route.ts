import { NextRequest, NextResponse } from "next/server";
import { callFunction } from "@/utils/db";

interface CorporateActionType {
  Id: number;
  Code: string;
  Name: string;
  BseCode: string | null;
  TrendlyneCode: string | null;
  MoneyControlCode: string | null;
  IsDividend: boolean;
  IsActive: boolean;
  CreatedOn?: number;
  UpdatedOn?: number;
}

// GET: Fetch all corporate action types using FetchCorporateActionType function
export async function GET() {
  try {
    const corporateActionTypes = await callFunction<CorporateActionType>({
      functionName: 'public."FetchCorporateActionType"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [],
    });

    return NextResponse.json(
      {
        success: true,
        data: corporateActionTypes,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching corporate action types:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch corporate action types",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
