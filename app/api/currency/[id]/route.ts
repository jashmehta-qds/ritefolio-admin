import { NextRequest, NextResponse } from "next/server";
import { queryDB, callFunction } from "@/utils/db";

interface Currency {
  Id: number;
  Name: string;
  CurrencyCode: string;
  CurrencySymbol: string;
  IsActive: boolean;
  CreatedOn?: number;
  UpdatedOn?: number;
}

// GET: Fetch a single currency by ID using FetchCurrencies function
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);

    const currencies = await callFunction<Currency>({
      functionName: 'public."FetchCurrencies"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [id, null, null, null],
    });

    if (currencies.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Currency not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: currencies[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching currency:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch currency",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT: Update a currency
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, currencyCode, currencySymbol, isActive } = body;

    // Validation
    if (!name || !currencyCode || !currencySymbol) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          message: "Name, currencyCode, and currencySymbol are required",
        },
        { status: 400 }
      );
    }

    await queryDB({
      query: `
        UPDATE public."CurrencyMaster"
        SET "Name" = $1, "CurrencyCode" = $2, "CurrencySymbol" = $3, "IsActive" = $4, "UpdatedAt" = NOW()
        WHERE "Id" = $5
      `,
      dbName: process.env.PG_DEFAULT_DB,
      params: [name, currencyCode, currencySymbol, isActive, id],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Currency updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating currency:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update currency",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE: Delete a currency
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await queryDB({
      query: `DELETE FROM public."CurrencyMaster" WHERE "Id" = $1`,
      dbName: process.env.PG_DEFAULT_DB,
      params: [id],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Currency deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting currency:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete currency",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
