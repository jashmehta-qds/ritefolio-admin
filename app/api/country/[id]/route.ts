import { NextRequest, NextResponse } from "next/server";
import { queryDB, callFunction } from "@/utils/db";

interface Country {
  Id: number;
  Name: string;
  IsoCode: string;
  CurrencyName: string;
  CurrencyCode: string;
  CurrencySymbol: string;
  CountryCode: number;
  IsActive: boolean;
}

// GET: Fetch a single country by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const countries = await callFunction<Country>({
      functionName: 'public."FetchCountries"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [],
    });

    const country = countries.find((c) => c.Id === parseInt(id));

    if (!country) {
      return NextResponse.json(
        {
          success: false,
          error: "Country not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: country,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching country:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch country",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT: Update a country
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, isoCode, currencyCode, countryCode, isActive } = body;

    // Validation
    if (!name || !isoCode || !currencyCode || countryCode === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          message:
            "Name, isoCode, currencyCode, and countryCode are required",
        },
        { status: 400 }
      );
    }

    // First, get the currency ID
    const currencyResult = await queryDB<{ Id: number }>({
      query: `SELECT "Id" FROM public."CurrencyMaster" WHERE "CurrencyCode" = $1`,
      dbName: process.env.PG_DEFAULT_DB,
      params: [currencyCode],
    });

    if (currencyResult.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid currency code",
          message: "Please update the value in Currency Table.",
        },
        { status: 400 }
      );
    }

    const currencyId = currencyResult[0].Id;

    // Update the country
    await queryDB({
      query: `
        UPDATE public."Country"
        SET "Name" = $1, "IsoCode" = $2, "CurrencyId" = $3, "CountryCode" = $4, "IsActive" = $5, "UpdatedAt" = NOW()
        WHERE "Id" = $6
      `,
      dbName: process.env.PG_DEFAULT_DB,
      params: [name, isoCode, currencyId, countryCode, isActive, id],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Country updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating country:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update country",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE: Delete a country
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await queryDB({
      query: `DELETE FROM public."Country" WHERE "Id" = $1`,
      dbName: process.env.PG_DEFAULT_DB,
      params: [id],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Country deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting country:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete country",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
