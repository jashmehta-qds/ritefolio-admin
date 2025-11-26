import { NextRequest, NextResponse } from "next/server";
import { callFunction } from "@/utils/db";
import {
  getCurrentFYEndEpoch,
  getFYStartEpochByYear,
} from "@/utils/date";

interface CorporateActionRecord {
  Id: string;
  SourceStockId: string;
  Isin: string;
  Symbol: string;
  StockName: string;
  CorporateActionTypeId: number;
  CorporateActionName: string;
  ExDate: number;
  RecordDate: number;
  AllotmentDate: number | null;
  Remark: string | null;
  IsActive: boolean;
  CreatedOn: number;
  UpdatedOn: number | null;
}

// GET: Fetch corporate action records using FetchCorpActionRecords function
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Get FY dates as defaults - start from 2 years back, end at current FY
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Determine current FY year
    const currentFYYear = currentMonth < 3 ? currentYear - 1 : currentYear;

    // Get FY start from 2 years back
    const twoYearsBackFYYear = currentFYYear - 2;
    const fyStartEpoch = getFYStartEpochByYear(twoYearsBackFYYear);
    const fyEndEpoch = getCurrentFYEndEpoch();

    // Extract query parameters
    const sourceStockId = searchParams.get("sourceStockId") || null;
    const corpActionId = searchParams.get("corpActionId") || null;
    const startDate = searchParams.get("startDate")
      ? parseInt(searchParams.get("startDate")!)
      : fyStartEpoch;
    const endDate = searchParams.get("endDate")
      ? parseInt(searchParams.get("endDate")!)
      : fyEndEpoch;
    const actionRecordId = searchParams.get("actionRecordId") || null;
    const isActive = searchParams.get("isActive") || null;
    const rowStart = parseInt(searchParams.get("rowStart") || "0");
    const rowLimit = parseInt(searchParams.get("rowLimit") || "1000");

    const records = await callFunction<CorporateActionRecord>({
      functionName: 'public."FetchCorpActionRecords"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [
        sourceStockId,
        corpActionId ? parseInt(corpActionId) : null,
        startDate,
        endDate,
        actionRecordId,
        isActive !== null ? isActive === "true" : null,
        rowStart,
        rowLimit,
      ],
    });

    return NextResponse.json(
      {
        success: true,
        data: records,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching corporate action records:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch corporate action records",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST: Add a new corporate action with details using AddCorporateAction procedure
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      sourceStockId,
      corpActionTypeId,
      exDate,
      recordDate,
      allotmentDate,
      details,
      remark,
    } = body;

    // Validate required fields
    if (!sourceStockId || !corpActionTypeId || !exDate || !recordDate || !details) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }

    // Validate details array
    if (!Array.isArray(details) || details.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "At least one detail is required",
        },
        { status: 400 }
      );
    }

    // Transform details to match the procedure's expected format
    const formattedDetails = details.map((detail: any) => ({
      target_stock_id: detail.targetStockId || null,
      ratio_quantity_held: detail.ratioQuantityHeld,
      ratio_quantity_entitled: detail.ratioQuantityEntitled,
      ratio_book_value_held: detail.ratioBookValueHeld || null,
      ratio_book_value_entitled: detail.ratioBookValueEntitled || null,
      target_sale_row: detail.targetSaleRow || false,
      remark: detail.remark || null,
    }));

    // Call the AddCorporateAction procedure
    const result = await callFunction<{ p_added_row_id: string }>({
      functionName: 'public."AddCorporateAction"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [
        null, // OUT parameter placeholder
        sourceStockId,
        corpActionTypeId,
        exDate,
        recordDate,
        allotmentDate,
        JSON.stringify(formattedDetails),
        remark || null,
      ],
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: result[0]?.p_added_row_id,
        },
        message: "Corporate action added successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding corporate action:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add corporate action",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
