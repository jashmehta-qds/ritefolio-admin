import { NextRequest, NextResponse } from "next/server";
import { callFunction } from "@/utils/db";

export interface Stock {
  Id: string;
  CountryId: number;
  InvestmentTypeId: number;
  Isin: string;
  Name: string;
  FaceValue: number;
  Listed: boolean;
  Symbol: string;
  BseCode: string;
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
  CreatedOn: number;
  UpdatedOn: number | null;
}

// GET: Search stocks using FetchStocks function
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Extract query parameters
    const search = searchParams.get("search"); // Universal search across symbol, isin, name, bseCode
    const symbol = searchParams.get("symbol");
    const isin = searchParams.get("isin");
    const stockName = searchParams.get("stockName");
    const bseCode = searchParams.get("bseCode");
    const investmentTypeId = searchParams.get("investmentTypeId");
    const countryId = searchParams.get("countryId");
    const isListed = searchParams.get("isListed");
    const isActive = searchParams.get("isActive");
    const stockId = searchParams.get("stockId");
    const parentStockId = searchParams.get("parentStockId");
    const limit = parseInt(searchParams.get("limit") || "50");

    // If search parameter is provided, use it for all searchable fields
    const searchValue = search || symbol || isin || stockName || bseCode || null;

    const stocks = await callFunction<Stock>({
      functionName: 'ritefolio."FetchStocks"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [
        searchValue, // p_symbol (will search across symbol, isin, name, bseCode due to OR conditions)
        searchValue, // p_isin
        searchValue, // p_stock_name
        searchValue, // p_bse_code
        investmentTypeId ? parseInt(investmentTypeId) : null, // p_investment_type
        countryId ? parseInt(countryId) : null, // p_country_id
        isListed !== null ? isListed === "true" : null, // p_is_listed
        isActive !== null ? isActive === "true" : true, // p_is_active (default true)
        stockId || null, // p_stock_id
        parentStockId || null, // p_parent_stock_id
      ],
    });

    // Limit results for performance
    const limitedStocks = stocks.slice(0, limit);

    return NextResponse.json(
      {
        success: true,
        data: limitedStocks,
        count: limitedStocks.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching stocks:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch stocks",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
