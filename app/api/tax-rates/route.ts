import { NextRequest, NextResponse } from "next/server";
import { queryDB } from "@/utils/db";

interface TaxRate {
  Id: number;
  CountryId: number;
  ResidentCountryId: number | null;
  Country: string;
  TaxAssetId: number;
  TaxAsset: string;
  LegalStatusId: number;
  LegalStatus: string;
  Period: number;
  StartDate: number;
  EndDate: number | null;
  StcgRate: number;
  LtcgRate: number;
  IncomeRate: number;
  LtcgExemption: number;
  IndexationApplicable: boolean;
  Note: string | null;
  IsActive: boolean;
  CreatedOn: number;
  UpdatedOn: number | null;
}

// GET: Fetch tax rates, optionally filtered by countryId and legalStatusId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const countryId = searchParams.get("countryId");
    const legalStatusId = searchParams.get("legalStatusId");

    const taxRates = await queryDB<TaxRate>({
      query: `SELECT * FROM public."FetchTaxRates"(
        p_country_id := $1,
        p_legal_status_id := $2
      )`,
      dbName: process.env.PG_DEFAULT_DB,
      params: [
        countryId ? parseInt(countryId) : null,
        legalStatusId ? parseInt(legalStatusId) : null,
      ],
    });

    return NextResponse.json(
      { success: true, data: taxRates },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching tax rates:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch tax rates",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// POST: Create a new tax rate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      countryId,
      residentCountryId,
      taxAssetId,
      legalStatusId,
      period,
      startDate,
      endDate,
      stcgRate,
      ltcgRate,
      incomeRate,
      ltcgExemption = 0,
      indexationApplicable = false,
      note,
      isActive = true,
    } = body;

    if (
      !countryId ||
      !taxAssetId ||
      !legalStatusId ||
      !period ||
      !startDate ||
      stcgRate === undefined ||
      ltcgRate === undefined ||
      incomeRate === undefined
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          message:
            "CountryId, TaxAssetId, LegalStatusId, Period, StartDate, StcgRate, LtcgRate, and IncomeRate are required",
        },
        { status: 400 },
      );
    }

    await queryDB({
      query: `CALL public."InsertTaxRate"($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      dbName: process.env.PG_DEFAULT_DB,
      params: [
        countryId,
        residentCountryId ?? null,
        taxAssetId,
        legalStatusId,
        period,
        startDate,
        endDate ?? null,
        stcgRate,
        ltcgRate,
        incomeRate,
        ltcgExemption,
        indexationApplicable,
        note ?? null,
        isActive,
      ],
    });

    return NextResponse.json(
      { success: true, message: "Tax rate created successfully" },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating tax rate:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create tax rate",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
