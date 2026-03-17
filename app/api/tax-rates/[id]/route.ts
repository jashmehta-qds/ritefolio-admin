import { NextRequest, NextResponse } from "next/server";
import { queryDB } from "@/utils/db";

// PUT: Update a tax rate
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      isActive,
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
        UPDATE public."TaxRates"
        SET
          "CountryId" = $1,
          "InvestmentId" = $2,
          "LegalStatusId" = $3,
          "StgSttRate" = $4,
          "StgNonSttRate" = $5,
          "LtgSttRate" = $6,
          "LtgNonSttRate" = $7,
          "IncomeRate" = $8,
          "IsCorporate" = $9,
          "IsActive" = $10,
          "StartDate" = $11,
          "EndDate" = $12
        WHERE "Id" = $13
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
        id,
      ],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Tax rate updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating tax rate:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update tax rate",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE: Delete a tax rate
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await queryDB({
      query: `DELETE FROM public."TaxRates" WHERE "Id" = $1`,
      dbName: process.env.PG_DEFAULT_DB,
      params: [id],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Tax rate deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting tax rate:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete tax rate",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
