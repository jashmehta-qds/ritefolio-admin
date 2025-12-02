import { NextRequest, NextResponse } from "next/server";
import { callProcedure, callFunction } from "@/utils/db";

interface Currency {
  Id: number;
  Name: string;
  CurrencyCode: string;
  CurrencySymbol: string;
  IsActive: boolean;
  CreatedOn?: number;
  UpdatedOn?: number;
}

// GET: Fetch all currencies using FetchCurrencies function
export async function GET() {
  try {
    const currencies = await callFunction<Currency>({
      functionName: 'public."FetchCurrencies"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [],
    });

    return NextResponse.json(
      {
        success: true,
        data: currencies,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching currencies:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch currencies",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST: Create a new currency
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, currencyCode, currencySymbol, isActive = true } = body;

    // Validation
    if (!name || !currencyCode || !currencySymbol) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          message: "Name, currencyCode, and currencySymbol are required",
        },
        { status: 400 }
      );
    }

    // Call the InsertCurrency procedure
    await callProcedure({
      procedureName: 'public."InsertCurrency"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [name, currencyCode, currencySymbol, isActive],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Currency created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating currency:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create currency",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
