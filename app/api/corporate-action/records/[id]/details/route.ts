import { NextRequest, NextResponse } from "next/server";
import { callFunction } from "@/utils/db";

interface CorporateActionDetail {
  Id: string;
  CorporateActionRecordId: string;
  TargetStockId: string | null;
  Isin: string | null;
  Symbol: string | null;
  StockName: string | null;
  RatioQuantityHeld: number;
  RatioQuantityEntitled: number;
  RatioBookValueHeld: number | null;
  RatioBookValueEntitled: number | null;
  TargetSaleRow: boolean | null;
  Remark: string | null;
  IsActive: boolean;
  CreatedOn: number;
  UpdatedOn: number | null;
}

// GET: Fetch corporate action details for a specific record
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Record ID is required",
        },
        { status: 400 }
      );
    }

    const details = await callFunction<CorporateActionDetail>({
      functionName: 'public."FetchCorpActionDetails"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [
        id, // p_action_record_id
        null, // p_target_stock_id
        null, // p_action_detail_id
        null, // p_is_active
        0, // p_row_start
        1000, // p_row_limit
      ],
    });

    return NextResponse.json(
      {
        success: true,
        data: details,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching corporate action details:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch corporate action details",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
