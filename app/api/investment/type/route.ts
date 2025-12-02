import { NextRequest, NextResponse } from "next/server";
import { callProcedure, callFunction } from "@/utils/db";

interface InvestmentType {
  Id: number;
  InvestmentId: number;
  InvestmentCategory: string;
  ShortCode: string;
  Description: string;
  IsActive: boolean;
}

// GET: Fetch all investment types using FetchInvestmentTypes function
export async function GET() {
  try {
    const types = await callFunction<InvestmentType>({
      functionName: 'public."FetchInvestmentTypes"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [],
    });

    return NextResponse.json(
      {
        success: true,
        data: types,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching investment types:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch investment types",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST: Create a new investment type using InsertInvestmentType procedure
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      shortCode,
      description,
      investmentSegmentId,
      isActive = true,
    } = body;

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

    // Call the InsertInvestmentType procedure
    await callProcedure({
      procedureName: 'public."InsertInvestmentType"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [
        shortCode,
        description || null,
        investmentSegmentId,
        null, // p_category - we're using ID instead
        isActive,
      ],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Investment type created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating investment type:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create investment type",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
