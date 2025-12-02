import { NextRequest, NextResponse } from "next/server";
import { callProcedure, callFunction } from "@/utils/db";

interface InvestmentSegment {
  Id: number;
  Category: string;
  Description: string;
  IsActive: boolean;
}

// GET: Fetch all investment segments using FetchInvestmentSegments function
export async function GET() {
  try {
    const segments = await callFunction<InvestmentSegment>({
      functionName: 'public."FetchInvestmentSegments"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [],
    });

    return NextResponse.json(
      {
        success: true,
        data: segments,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching investment segments:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch investment segments",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST: Create a new investment segment using InsertInvestmentSegment procedure
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, description, isActive = true } = body;

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

    // Call the InsertInvestmentSegment procedure
    await callProcedure({
      procedureName: 'public."InsertInvestmentSegment"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [category, description || null, isActive],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Investment segment created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating investment segment:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create investment segment",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
