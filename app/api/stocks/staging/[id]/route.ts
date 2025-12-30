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
}

// GET: Fetch a single staging stock by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const stocks = await callFunction<Stock>({
      functionName: 'public."FetchStagingStocks"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [
        null, // symbol
        null, // isin
        null, // stockName
        null, // bseCode
        null, // investmentType
        null, // countryId
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
    console.error("Error fetching staging stock:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch staging stock",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT: Update a staging stock using UpdateStagingStock procedure
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
      basicIndustry,
      sectoralIndex,
      slb,
      isActive,
    } = body;

    await callProcedure({
      procedureName: 'public."UpdateStagingStock"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [
        id, // p_stock_id
        countryId || null,
        investmentType || null,
        isin || null,
        stockName || null,
        faceValue || null,
        false, // p_is_listed = false for staging stocks
        symbol || null,
        bseCode || null,
        null, // macroSector
        null, // sector
        null, // industry
        basicIndustry || null,
        sectoralIndex || null,
        slb || false,
        null, // listingDate
        null, // recordDate
        null, // issueDate
        null, // maturityDate
        null, // ipoDate
        null, // broadIndustry
        null, // series
        null, // issuer
        null, // couponRate
        null, // couponFrequency
        null, // status
        null, // description
        null, // schemeName
        null, // parentStockId
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
    console.error("Error updating staging stock:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update staging stock",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
