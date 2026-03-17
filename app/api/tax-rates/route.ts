import { NextRequest, NextResponse } from "next/server";
import { queryDB } from "@/utils/db";

interface TaxRate {
  Id: number;
  CountryId: number;
  CountryName: string;
  InvestmentId: number;
  InvestmentSegmentName: string;
  LegalStatusId: number;
  LegalStatusName: string;
  StgSttRate: number;
  StgNonSttRate: number;
  LtgSttRate: number;
  LtgNonSttRate: number;
  IncomeRate: number;
  IsCorporate: boolean;
  IsActive: boolean;
  StartDate: number;
  EndDate: number | null;
  CreatedOn: number;
}

// GET: Fetch all tax rates with country, investment segment, and legal status details
export async function GET() {
  try {
    const taxRates = await queryDB<TaxRate>({
      query: `
        SELECT
          tr."Id",
          tr."CountryId",
          c."Name" AS "CountryName",
          tr."InvestmentId",
          iseg."Category" AS "InvestmentSegmentName",
          tr."LegalStatusId",
          ls."Name" AS "LegalStatusName",
          tr."StgSttRate",
          tr."StgNonSttRate",
          tr."LtgSttRate",
          tr."LtgNonSttRate",
          tr."IncomeRate",
          tr."IsCorporate",
          tr."IsActive",
          tr."StartDate",
          tr."EndDate",
          tr."CreatedOn"
        FROM public."TaxRates" tr
        LEFT JOIN public."Country" c ON tr."CountryId" = c."Id"
        LEFT JOIN public."InvestmentSegments" iseg ON tr."InvestmentId" = iseg."Id"
        LEFT JOIN public."LegalStatus" ls ON tr."LegalStatusId" = ls."Id"
        ORDER BY tr."Id" ASC
      `,
      dbName: process.env.PG_DEFAULT_DB,
    });

    return NextResponse.json(
      {
        success: true,
        data: taxRates,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching tax rates:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch tax rates",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST: Create a new tax rate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      countryId,
      investmentId,
      legalStatusId,
      stgSttRate,
      stgNonSttRate,
      ltgSttRate,
      ltgNonSttRate,
      incomeRate,
      isCorporate,
      isActive = true,
      startDate,
      endDate,
    } = body;

    if (
      !countryId ||
      !investmentId ||
      !legalStatusId ||
      stgSttRate === undefined ||
      stgNonSttRate === undefined ||
      ltgSttRate === undefined ||
      ltgNonSttRate === undefined ||
      incomeRate === undefined ||
      isCorporate === undefined ||
      !startDate
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          message:
            "CountryId, InvestmentId, LegalStatusId, all rate fields, IsCorporate, and StartDate are required",
        },
        { status: 400 }
      );
    }

    await queryDB({
      query: `
        INSERT INTO public."TaxRates"
          ("CountryId", "InvestmentId", "LegalStatusId", "StgSttRate", "StgNonSttRate",
           "LtgSttRate", "LtgNonSttRate", "IncomeRate", "IsCorporate", "IsActive", "StartDate", "EndDate")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
      dbName: process.env.PG_DEFAULT_DB,
      params: [
        countryId,
        investmentId,
        legalStatusId,
        stgSttRate,
        stgNonSttRate,
        ltgSttRate,
        ltgNonSttRate,
        incomeRate,
        isCorporate,
        isActive,
        startDate,
        endDate ?? null,
      ],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Tax rate created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating tax rate:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create tax rate",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
