import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { safeErrorMessage } from "@/lib/api/errors";
import { callFunction } from "@/utils/db";

interface Plan {
  Id: number;
  Key: string;
  Name: string;
  Description: string | null;
  MonthlyPrice: string;
  YearlyPrice: string;
  Currency: string;
  MaxYearlyTransactions: number | null;
  IsPurchasable: boolean;
  IsPublic: boolean;
  IsPopular: boolean;
  SortOrder: number;
  IsActive: boolean;
  Features: string[];
  AddOns: { blockSize: number; price: number }[];
}

// GET: Fetch all subscription plans using FetchPlans function
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const plans = await callFunction<Plan>({
      functionName: 'public."FetchPlans"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [],
      orderBy: false, // ordered by SortOrder inside the function
    });

    return NextResponse.json(
      {
        success: true,
        data: plans,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching plans:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch plans",
        message: safeErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
