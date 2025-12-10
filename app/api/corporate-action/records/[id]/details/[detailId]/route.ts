import { NextRequest, NextResponse } from "next/server";
import { callProcedure } from "@/utils/db";

interface UpdateDetailParams {
  actionRecordId: string;
  targetStockId: string | null;
  ratioQuantityHeld: number;
  ratioQuantityEntitled: number;
  ratioBookValueHeld: number | null;
  ratioBookValueEntitled: number | null;
  targetSaleRow: boolean | null;
  referenceDocUrl: string | null;
  remark: string | null;
  isActive: boolean;
}

// PUT: Update a corporate action detail
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; detailId: string }> }
) {
  try {
    const { detailId } = await params;
    const body: UpdateDetailParams = await request.json();

    // Validate required fields
    if (
      !body.actionRecordId ||
      body.ratioQuantityHeld === undefined ||
      body.ratioQuantityEntitled === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }

    // Call the UpdateCorpActDetail procedure
    await callProcedure({
      procedureName: 'public."UpdateCorpActDetail"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [
        detailId, // p_action_detail_id
        body.actionRecordId, // p_action_record_id
        body.targetStockId, // p_target_stock_id
        body.ratioQuantityHeld, // p_ratio_quantity_held
        body.ratioQuantityEntitled, // p_ratio_quantity_entitled
        body.ratioBookValueHeld ?? null, // p_ratio_book_value_held
        body.ratioBookValueEntitled ?? null, // p_ratio_book_value_entitled
        body.targetSaleRow ?? false, // p_target_sale_row
        body.referenceDocUrl ?? null, // p_reference_doc_url (comes before remark!)
        body.remark ?? null, // p_remark (comes after reference_doc_url!)
        body.isActive ?? true, // p_is_active
      ],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Corporate action detail updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating corporate action detail:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update corporate action detail",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE: Delete a corporate action detail
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; detailId: string }> }
) {
  try {
    const { detailId } = await params;

    if (!detailId) {
      return NextResponse.json(
        {
          success: false,
          error: "Detail ID is required",
        },
        { status: 400 }
      );
    }

    // Call the DeleteCorpActDetail procedure
    await callProcedure({
      procedureName: 'public."DeleteCorpActDetail"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [detailId],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Corporate action detail deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting corporate action detail:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete corporate action detail",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
