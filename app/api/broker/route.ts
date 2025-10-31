import { NextRequest, NextResponse } from "next/server";
import { callProcedure, callFunction } from "@/utils/db";

interface Broker {
  Id: number;
  Name: string;
  ShortCode: string;
  IsBroker: boolean;
  IsDiscountBroker: boolean;
  IsActive: boolean;
  CreatedOn?: number;
  UpdatedOn?: number;
}

// GET: Fetch all brokers using FetchStockBroker function
export async function GET() {
  try {
    const brokers = await callFunction<Broker>({
      functionName: 'public."FetchStockBroker"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [],
    });

    return NextResponse.json(
      {
        success: true,
        data: brokers,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching brokers:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch brokers",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST: Create a new broker
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      shortCode,
      isBroker = true,
      isDiscountBroker = true,
      isActive = true,
    } = body;

    // Validation
    if (!name || !shortCode) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
          message: "Name and shortCode are required",
        },
        { status: 400 }
      );
    }

    // Call the InsertStockBroker procedure
    await callProcedure({
      procedureName: 'public."InsertStockBroker"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [name, shortCode, isBroker, isDiscountBroker, isActive],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Broker created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating broker:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create broker",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
