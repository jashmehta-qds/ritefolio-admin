import { NextResponse } from "next/server";
import { queryDB } from "@/utils/db";

interface LegalStatus {
  Id: number;
  Name: string;
  IsActive: boolean;
}

// GET: Fetch all legal statuses
export async function GET() {
  try {
    const legalStatuses = await queryDB<LegalStatus>({
      query: `SELECT "Id", "Name", "IsActive" FROM public."LegalStatus" ORDER BY "Id" ASC`,
      dbName: process.env.PG_DEFAULT_DB,
    });

    return NextResponse.json(
      {
        success: true,
        data: legalStatuses,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching legal statuses:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch legal statuses",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
