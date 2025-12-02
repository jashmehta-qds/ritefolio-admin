import { NextRequest, NextResponse } from "next/server";
import { queryDB, callFunction } from "@/utils/db";

interface InvestmentType {
  Id: number;
  InvestmentId: number;
  InvestmentCategory: string;
  ShortCode: string;
  Description: string;
  IsActive: boolean;
}

// GET: Fetch a single investment type by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const types = await callFunction<InvestmentType>({
      functionName: 'public."FetchInvestmentTypes"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [],
    });

    const type = types.find((t) => t.Id === parseInt(id));

    if (!type) {
      return NextResponse.json(
        {
          success: false,
          error: "Investment type not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: type,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching investment type:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch investment type",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT: Update an investment type
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { shortCode, description, investmentSegmentId, isActive } = body;

    // Validation
    if (!shortCode || !investmentSegmentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          message: "Short code and investment segment are required",
        },
        { status: 400 }
      );
    }

    // Update the investment type
    await queryDB({
      query: `
        UPDATE public."InvestmentTypes"
        SET
          "InvestmentId" = $1,
          "ShortCode" = $2,
          "Description" = $3,
          "IsActive" = $4,
          "UpdatedAt" = NOW()
        WHERE "Id" = $5
      `,
      dbName: process.env.PG_DEFAULT_DB,
      params: [
        investmentSegmentId,
        shortCode,
        description || null,
        isActive,
        id,
      ],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Investment type updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating investment type:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update investment type",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE: Delete an investment type
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await queryDB({
      query: `DELETE FROM public."InvestmentTypes" WHERE "Id" = $1`,
      dbName: process.env.PG_DEFAULT_DB,
      params: [id],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Investment type deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting investment type:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete investment type",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
