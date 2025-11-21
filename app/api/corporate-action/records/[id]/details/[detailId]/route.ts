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
        parseInt(detailId),
        body.actionRecordId,
        body.targetStockId,
        body.ratioQuantityHeld,
        body.ratioQuantityEntitled,
        body.ratioBookValueHeld,
        body.ratioBookValueEntitled,
        body.targetSaleRow,
        body.remark,
        body.isActive ?? true,
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
