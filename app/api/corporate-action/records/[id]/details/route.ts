import { NextRequest, NextResponse } from "next/server";
import { callFunction, callProcedure } from "@/utils/db";
import { callBulkUpsertCorpActionLogs } from "@/utils/corporateAction";

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

// POST: Add a new corporate action detail
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "Record ID is required",
        },
        { status: 400 }
      );
    }

    const {
      targetStockId,
      ratioQuantityHeld,
      ratioQuantityEntitled,
      ratioBookValueHeld,
      ratioBookValueEntitled,
      targetSaleRow,
      referenceDocUrl,
      isActive = true,
      remark,
    } = body;

    // Validate required fields
    if (
      ratioQuantityHeld === undefined ||
      ratioQuantityHeld === null ||
      ratioQuantityEntitled === undefined ||
      ratioQuantityEntitled === null
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Ratio quantities are required",
        },
        { status: 400 }
      );
    }

    // Call the InsertCorpActDetail procedure
    const result = await callProcedure({
      procedureName: 'public."InsertCorpActDetail"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [
        null, // p_added_row_id (OUT parameter)
        id, // p_corp_act_record_id
        targetStockId && targetStockId.trim() !== "" ? targetStockId : null, // p_target_stock_id
        ratioQuantityHeld, // p_ratio_quantity_held
        ratioQuantityEntitled, // p_ratio_quantity_entitled
        ratioBookValueHeld ?? null, // p_ratio_book_value_held
        ratioBookValueEntitled ?? null, // p_ratio_book_value_entitled
        targetSaleRow ?? false, // p_target_sale_row
        referenceDocUrl && referenceDocUrl.trim() !== ""
          ? referenceDocUrl
          : null, // p_reference_doc_url
        isActive ?? true, // p_is_active
        remark && remark.trim() !== "" ? remark : null, // p_remark
      ],
    });

    // Call BulkUpsertCorpActionLogs procedure after successful add
    await callBulkUpsertCorpActionLogs();

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: "Corporate action detail added successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding corporate action detail:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add corporate action detail",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
