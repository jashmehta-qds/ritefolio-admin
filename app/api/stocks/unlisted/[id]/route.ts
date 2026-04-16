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

// PUT: Update an unlisted stock using UpdateStagingStock procedure
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
      listingDate,
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
      procedureName: 'public."UpdateStagingStock"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [
        id,                 // p_stock_id
        countryId,          // p_country_id
        investmentType,     // p_investment_type (VARCHAR — accepts ID or ShortCode)
        isin || null,       // p_isin
        stockName,          // p_stock_name
        faceValue,          // p_face_value
        false,              // p_is_listed = false for unlisted stocks
        symbol || null,     // p_symbol
        bseCode || null,    // p_bse_code
        macroSector || null,    // p_macro_sector
        sector || null,         // p_sector
        industry || null,       // p_industry
        basicIndustry || null,  // p_basic_industry
        sectoralIndex || null,  // p_sectoral_index
        slb || false,           // p_slb
        listingDate || null,    // p_listing_date
        recordDate || null,     // p_record_date
        issueDate || null,      // p_issue_date
        maturityDate || null,   // p_maturity_date
        ipoDate || null,        // p_ipo_date
        broadIndustry || null,  // p_broad_industry
        series || null,         // p_series
        issuer || null,         // p_issuer
        couponRate || null,     // p_coupon_rate
        couponFrequency || null, // p_coupon_frequency
        status || null,         // p_status
        description || null,    // p_description
        schemeName || null,     // p_scheme_name
        parentStockId || null,  // p_parent_stock_id
        isActive !== undefined ? isActive : true, // p_is_active
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
