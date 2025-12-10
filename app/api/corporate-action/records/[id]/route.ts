import { NextRequest, NextResponse } from "next/server";
import { callProcedure } from "@/utils/db";

interface UpdateRecordParams {
  sourceStockId: string;
  corpActionTypeId: number;
  exDate: number;
  recordDate: number;
  allotmentDate: number | null;
  remark: string | null;
  isActive: boolean;
}

// PUT: Update a corporate action record
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recordId } = await params;
    const body: UpdateRecordParams = await request.json();

    // Validate required fields
    if (
      !body.sourceStockId ||
      !body.corpActionTypeId ||
      !body.exDate ||
      !body.recordDate
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }

    // Call the UpdateCorpActRecord procedure
    await callProcedure({
      procedureName: 'public."UpdateCorpActRecord"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [
        recordId,
        body.sourceStockId,
        body.corpActionTypeId,
        body.exDate,
        body.recordDate,
        body.allotmentDate,
        body.remark,
        body.isActive ?? true,
      ],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Corporate action record updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating corporate action record:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update corporate action record",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE: Delete a corporate action record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: recordId } = await params;

    if (!recordId) {
      return NextResponse.json(
        {
          success: false,
          error: "Record ID is required",
        },
        { status: 400 }
      );
    }

    // Call the DeleteCorpActRecord procedure
    await callProcedure({
      procedureName: 'public."DeleteCorpActRecord"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [recordId],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Corporate action record deleted successfully",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting corporate action record:", error);

    // Check for foreign key constraint violation
    if (error?.code === '23503' || error?.message?.includes('foreign key') || error?.message?.includes('violates foreign key constraint')) {
      return NextResponse.json(
        {
          success: false,
          error: "Cannot delete record",
          message: "This corporate action record has associated details. Please delete all detail records first before deleting the main record.",
        },
        { status: 409 } // 409 Conflict
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete corporate action record",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
