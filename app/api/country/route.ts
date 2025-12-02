import { NextRequest, NextResponse } from "next/server";
import { callProcedure, callFunction } from "@/utils/db";

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

// GET: Fetch all countries using FetchCountries function
export async function GET() {
  try {
    const countries = await callFunction<Country>({
      functionName: 'public."FetchCountries"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [],
    });

    return NextResponse.json(
      {
        success: true,
        data: countries,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching countries:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch countries",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST: Create a new country using InsertCountry procedure
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      isoCode,
      currencyCode,
      countryCode,
      isActive = true,
    } = body;

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

    // Call the InsertCountry procedure
    await callProcedure({
      procedureName: 'public."InsertCountry"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [name, isoCode, currencyCode, countryCode, isActive],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Country created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating country:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create country",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
