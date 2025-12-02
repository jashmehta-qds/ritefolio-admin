import { NextRequest, NextResponse } from "next/server";
import { callProcedure, callFunction } from "@/utils/db";

interface Exchange {
  Id: number;
  CountryId: number;
  CountryName: string;
  ExchangeCode: string;
  Name: string;
  BloombergCode: string;
  IsoMic: string;
  EodCode: string;
  Description: string;
  IsActive: boolean;
}

// GET: Fetch all exchanges using FetchExchange function
export async function GET() {
  try {
    const exchanges = await callFunction<Exchange>({
      functionName: 'public."FetchExchange"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [],
    });

    return NextResponse.json(
      {
        success: true,
        data: exchanges,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching exchanges:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch exchanges",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST: Create a new exchange using InsertStockExchange procedure
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      countryId,
      exchangeCode,
      name,
      isoMic,
      description,
      bloombergCode,
      eodCode,
      isActive = true,
    } = body;

    // Validation
    if (!countryId || !exchangeCode || !name || !isoMic) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          message:
            "Country, Exchange Code, Name, and ISO MIC are required fields",
        },
        { status: 400 }
      );
    }

    // Call the InsertStockExchange procedure
    await callProcedure({
      procedureName: 'public."InsertStockExchange"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [
        countryId,
        exchangeCode,
        name,
        isoMic,
        description || null,
        bloombergCode || null,
        eodCode || null,
        isActive,
      ],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Exchange created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating exchange:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create exchange",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
