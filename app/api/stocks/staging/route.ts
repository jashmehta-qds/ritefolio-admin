import { NextRequest, NextResponse } from "next/server";
import { callFunction, callProcedure } from "@/utils/db";

interface Stock {
  Id: string;
  CountryId: number;
  InvestmentTypeId: number;
  Isin: string | null;
  Name: string;
  FaceValue: number;
  Listed: boolean;
  Symbol: string | null;
  BseCode: string | null;
  MacroSector: string | null;
  Sector: string | null;
  Industry: string | null;
  BasicIndustry: string | null;
  SectoralIndex: string | null;
  Slb: boolean | null;
  ListingDate: number | null;
  RecordDate: number | null;
  IssueDate: number | null;
  MaturityDate: number | null;
  IpoDate: number | null;
  BroadIndustry: string | null;
  Series: string | null;
  Issuer: string | null;
  CouponRate: number | null;
  CouponFrequency: string | null;
  Status: string | null;
  Description: string | null;
  SchemeName: string | null;
  ParentStockId: string | null;
  IsActive: boolean;
  CreatedOn?: number;
  UpdatedOn?: number;
}

// GET: Fetch all staging stocks using FetchStagingStocks function with pagination
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get("symbol") || null;
    const isin = searchParams.get("isin") || null;
    const stockName = searchParams.get("stockName") || null;
    const bseCode = searchParams.get("bseCode") || null;
    const investmentType = searchParams.get("investmentType")
      ? parseInt(searchParams.get("investmentType")!)
      : null;
    const countryId = searchParams.get("countryId")
      ? parseInt(searchParams.get("countryId")!)
      : null;
    const isActive = searchParams.get("isActive") !== null
      ? searchParams.get("isActive") === "true"
      : true;

    // Pagination parameters
    const page = searchParams.get("page")
      ? parseInt(searchParams.get("page")!)
      : 1;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 50;
    const offset = (page - 1) * limit;

    const stocks = await callFunction<Stock>({
      functionName: 'public."FetchStagingStocks"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [
        symbol,
        isin,
        stockName,
        bseCode,
        investmentType,
        countryId,
        isActive,
        null, // p_stock_id
        null, // p_parent_stock_id
        offset, // p_row_start
        limit, // p_row_limit
      ],
    });

    return NextResponse.json(
      {
        success: true,
        data: stocks,
        pagination: {
          page,
          limit,
          hasMore: stocks.length === limit,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching staging stocks:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch staging stocks",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST: Add a new staging stock using InsertStockStaging procedure
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, isin, bseCode, stockName, countryId, createdBy } = body;

    // Validate that at least one identifier is provided
    if (!symbol && !isin && !bseCode) {
      return NextResponse.json(
        {
          success: false,
          error: "At least one of Symbol, ISIN, or BSE Code must be provided",
        },
        { status: 400 }
      );
    }

    // Call the InsertStockStaging procedure
    const result = await callFunction<{ v_stock_id: string }>({
      functionName: 'public."InsertStockStaging"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [
        symbol || null,
        isin || null,
        bseCode || null,
        stockName || null,
        countryId || null,
        createdBy || null,
      ],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Staging stock added successfully",
        data: result[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding staging stock:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add staging stock",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
