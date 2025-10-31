import { NextRequest, NextResponse } from "next/server";
import { queryDB, callFunction, callProcedure } from "@/utils/db";

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

// GET: Fetch a single broker by ID using FetchStockBroker function
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);

    const brokers = await callFunction<Broker>({
      functionName: 'public."FetchStockBroker"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [null, null],
    });

    const broker = brokers.find((b) => b.Id === id);

    if (!broker) {
      return NextResponse.json(
        {
          success: false,
          error: "Broker not found",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: broker,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching broker:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch broker",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT: Update a broker using UpdateStockBroker procedure
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await request.json();
    const { name, shortCode, isBroker, isDiscountBroker, isActive } = body;

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

    // Call the UpdateStockBroker procedure
    await callProcedure({
      procedureName: 'public."UpdateStockBroker"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [id, name, shortCode, isBroker, isDiscountBroker, isActive],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Broker updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating broker:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update broker",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE: Delete a broker
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await queryDB({
      query: `DELETE FROM public."StockBrokers" WHERE "Id" = $1`,
      dbName: process.env.PG_DEFAULT_DB,
      params: [id],
    });

    return NextResponse.json(
      {
        success: true,
        message: "Broker deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting broker:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete broker",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
