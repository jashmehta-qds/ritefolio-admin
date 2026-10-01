import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { safeErrorMessage } from "@/lib/api/errors";
import { queryDB } from "@/utils/db";

interface LegalStatus {
  Id: number;
  Classification: string;
}

// GET: Fetch all legal statuses
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const legalStatuses = await queryDB<LegalStatus>({
      query: `SELECT * FROM public."FetchLegalStatus"(NULL)`,
      dbName: process.env.PG_DEFAULT_DB,
    });

    return NextResponse.json(
      {
        success: true,
        data: legalStatuses,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching legal statuses:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch legal statuses",
        message: safeErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
