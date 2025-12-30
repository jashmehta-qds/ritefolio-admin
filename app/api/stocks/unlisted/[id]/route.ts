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
}

// GET: Fetch a single stock by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const stocks = await callFunction<Stock>({
      functionName: 'ritefolio."FetchStocks"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [
        null, // symbol
        null, // isin
        null, // stockName
        null, // bseCode
        null, // investmentType
        null, // countryId
        false, // p_is_listed = false for unlisted stocks
        null, // isActive (fetch both active and inactive)
        id,   // p_stock_id
        null, // p_parent_stock_id
        0,    // p_row_start
        1,    // p_row_limit
      ],
    });

    if (stocks.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Stock not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: stocks[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching stock:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch stock",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT: Update an unlisted stock using UpdateStockDirectory procedure
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      countryId,
      investmentType,
      isin,
      stockName,
      faceValue,
      symbol,
      bseCode,
      macroSector,
      sector,
      industry,
      basicIndustry,
      sectoralIndex,
      slb,
      recordDate,
      issueDate,
      maturityDate,
      ipoDate,
      broadIndustry,
      series,
      issuer,
      couponRate,
      couponFrequency,
      status,
      description,
      schemeName,
      parentStockId,
      isActive,
    } = body;

    // Validate required fields
    if (!countryId || !investmentType || !stockName || !faceValue) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          message: "Country, Investment Type, Stock Name, and Face Value are required",
        },
        { status: 400 }
      );
    }

    await callProcedure({
      procedureName: 'public."UpdateStockDirectory"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [
        id, // p_stock_id
        countryId,
        investmentType,
        isin || null,
        stockName,
        faceValue,
        false, // p_is_listed = false for unlisted stocks
        symbol || null,
        bseCode || null,
        macroSector || null,
        sector || null,
        industry || null,
        basicIndustry || null,
        sectoralIndex || null,
        slb || false,
        null, // listingDate - not applicable for unlisted
        recordDate || null,
        issueDate || null,
        maturityDate || null,
        ipoDate || null,
        broadIndustry || null,
        series || null,
        issuer || null,
        couponRate || null,
        couponFrequency || null,
        status || null,
        description || null,
        schemeName || null,
        parentStockId || null,
        isActive !== undefined ? isActive : true,
      ],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Stock updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating stock:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update stock",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
