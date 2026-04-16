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

// GET: Fetch all unlisted stocks using FetchStocks function with p_is_listed = false
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get("symbol") || null;
    const isin = searchParams.get("isin") || null;
    const stockName = searchParams.get("stockName") || null;
    const bseCode = searchParams.get("bseCode") || null;
    const investmentTypeIds = searchParams
      .getAll("investmentType")
      .map(Number)
      .filter((n) => !isNaN(n));
    const countryId = searchParams.get("countryId")
      ? parseInt(searchParams.get("countryId")!)
      : null;
    const isActive =
      searchParams.get("isActive") !== null
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
      functionName: 'ritefolio."FetchStocks"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [
        symbol,
        isin,
        stockName,
        bseCode,
        investmentTypeIds.length > 0 ? investmentTypeIds : null,
        countryId,
        false, // p_is_listed = false for unlisted stocks
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
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching unlisted stocks:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch unlisted stocks",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// POST: Add a new unlisted stock using InsertStockStaging_v1 procedure
export async function POST(request: NextRequest) {
  try {
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
    } = body;

    if (!countryId || !investmentType || !stockName || !faceValue || (!isin && !symbol)) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 },
      );
    }

    await callProcedure({
      procedureName: 'public."InsertStockStaging_v1"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [
        null,               // OUT v_stock_id UUID
        symbol || null,     // p_symbol
        isin || null,       // p_isin
        bseCode || null,    // p_bse_code
        stockName,          // p_stock_name
        countryId,          // p_country_id
        null,               // p_created_by UUID
        investmentType,     // p_investment_type_id
        faceValue,          // p_face_value
        false,              // p_listed = false for unlisted stocks
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
      ],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Unlisted stock added successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error adding unlisted stock:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add unlisted stock",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
