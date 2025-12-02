import { NextRequest, NextResponse } from "next/server";
import { queryDB, callFunction } from "@/utils/db";

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

// GET: Fetch a single exchange by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const exchanges = await callFunction<Exchange>({
      functionName: 'public."FetchExchange"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [],
    });

    const exchange = exchanges.find((e) => e.Id === parseInt(id));

    if (!exchange) {
      return NextResponse.json(
        {
          success: false,
          error: "Exchange not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: exchange,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching exchange:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch exchange",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT: Update an exchange
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      countryId,
      exchangeCode,
      name,
      isoMic,
      description,
      bloombergCode,
      eodCode,
      isActive,
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

    // Update the exchange
    await queryDB({
      query: `
        UPDATE public."StockExchanges"
        SET
          "CountryId" = $1,
          "ExchangeCode" = $2,
          "Name" = $3,
          "IsoMic" = $4,
          "Description" = $5,
          "BloombergCode" = $6,
          "EodCode" = $7,
          "IsActive" = $8,
          "UpdatedAt" = NOW()
        WHERE "Id" = $9
      `,
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
        id,
      ],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Exchange updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating exchange:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update exchange",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE: Delete an exchange
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await queryDB({
      query: `DELETE FROM public."StockExchanges" WHERE "Id" = $1`,
      dbName: process.env.PG_DEFAULT_DB,
      params: [id],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Exchange deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting exchange:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete exchange",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
