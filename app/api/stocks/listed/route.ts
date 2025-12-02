import { NextRequest, NextResponse } from "next/server";
import { callFunction, callProcedure } from "@/utils/db";

interface Stock {
  Id: string;
  CountryId: number;
  InvestmentTypeId: number;
  Isin: string;
  Name: string;
  FaceValue: number;
  Listed: boolean;
  Symbol: string;
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

// GET: Fetch all listed stocks using FetchStocks function with pagination
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
      functionName: 'ritefolio."FetchStocks"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [
        symbol,
        isin,
        stockName,
        bseCode,
        investmentType,
        countryId,
        true, // p_is_listed = true for listed stocks
        isActive,
        null, // p_stock_id
        null, // p_parent_stock_id
        offset, // p_row_start
        limit, // p_row_limit
      ],
    });

    // Filter only listed stocks
    const listedStocks = stocks.filter((stock) => stock.Listed === true);

    return NextResponse.json(
      {
        success: true,
        data: listedStocks,
        pagination: {
          page,
          limit,
          hasMore: listedStocks.length === limit,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching listed stocks:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch listed stocks",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST: Add a new listed stock using InsertStock procedure
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      countryId,
      investmentType,
      stockExchangeIds,
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
    if (!countryId || !investmentType || !isin || !stockName || !faceValue || !symbol || !stockExchangeIds) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 }
      );
    }

    await callProcedure({
      procedureName: 'public."InsertStock"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [
        countryId,
        investmentType,
        stockExchangeIds,
        isin,
        stockName,
        faceValue,
        true, // isListed = true for listed stocks
        symbol,
        bseCode || null,
        macroSector || null,
        sector || null,
        industry || null,
        basicIndustry || null,
        sectoralIndex || null,
        slb || false,
        listingDate || null,
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
        message: "Listed stock added successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding listed stock:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add listed stock",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
