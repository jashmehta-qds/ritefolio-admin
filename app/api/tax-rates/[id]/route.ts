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
      isActive,
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
        { status: 400 }
      );
    }

    await queryDB({
      query: `
        UPDATE public."TaxRates"
        SET
          "CountryId" = $1,
          "TaxAssetId" = $2,
          "LegalStatusId" = $3,
          "Period" = $4,
          "StartDate" = $5,
          "EndDate" = $6,
          "StcgRate" = $7,
          "LtcgRate" = $8,
          "IncomeRate" = $9,
          "LtcgExemption" = $10,
          "IndexationApplicable" = $11,
          "Note" = $12,
          "IsActive" = $13,
          "UpdatedOn" = EXTRACT(epoch FROM now())::INTEGER
        WHERE "Id" = $14
      `,
      dbName: process.env.PG_DEFAULT_DB,
      params: [
        countryId,
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
        id,
      ],
    });

    return NextResponse.json(
      { success: true, message: "Tax rate updated successfully" },
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
      { success: true, message: "Tax rate deleted successfully" },
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
