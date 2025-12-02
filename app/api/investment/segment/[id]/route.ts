import { NextRequest, NextResponse } from "next/server";
import { queryDB, callFunction } from "@/utils/db";

interface InvestmentSegment {
  Id: number;
  Category: string;
  Description: string;
  IsActive: boolean;
}

// GET: Fetch a single investment segment by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const segments = await callFunction<InvestmentSegment>({
      functionName: 'public."FetchInvestmentSegments"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [],
    });

    const segment = segments.find((s) => s.Id === parseInt(id));

    if (!segment) {
      return NextResponse.json(
        {
          success: false,
          error: "Investment segment not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: segment,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching investment segment:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch investment segment",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT: Update an investment segment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { category, description, isActive } = body;

    // Validation
    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          message: "Category is required",
        },
        { status: 400 }
      );
    }

    // Update the investment segment
    await queryDB({
      query: `
        UPDATE public."InvestmentSegments"
        SET
          "Category" = $1,
          "Description" = $2,
          "IsActive" = $3,
          "UpdatedAt" = NOW()
        WHERE "Id" = $4
      `,
      dbName: process.env.PG_DEFAULT_DB,
      params: [category, description || null, isActive, id],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Investment segment updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating investment segment:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update investment segment",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE: Delete an investment segment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await queryDB({
      query: `DELETE FROM public."InvestmentSegments" WHERE "Id" = $1`,
      dbName: process.env.PG_DEFAULT_DB,
      params: [id],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Investment segment deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting investment segment:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete investment segment",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
