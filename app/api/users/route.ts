import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { safeErrorMessage, clampLimit, parsePage } from "@/lib/api/errors";
import { callFunction } from "@/utils/db";

interface UserSubscriptionRow {
  UserId: string;
  Email: string | null;
  FullName: string | null;
  Provider: string | null;
  IsAdmin: boolean;
  SignedUpOn: number | null;
  LastSignInOn: number | null;
  ProfileCount: number;
  SubscriptionId: string | null;
  SubscribedPlanId: number | null;
  SubscribedPlanName: string | null;
  EffectivePlanId: number;
  EffectivePlanName: string | null;
  SubscriptionStatus: "ACTIVE" | "EXPIRED" | "NONE";
  SubscribedOn: number | null;
  ExpiresAt: number | null;
  TotalCount: string; // BIGINT comes back from pg as a string
}

const SUBSCRIPTION_STATUSES = new Set(["ACTIVE", "EXPIRED", "NONE"]);

// GET: Fetch users with their current subscription using FetchUserSubscriptions function
export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search")?.trim().slice(0, 100) || null;

    const planIdParam = searchParams.get("planId");
    const planId =
      planIdParam !== null && planIdParam !== "" ? parseInt(planIdParam) : null;
    if (planId !== null && (isNaN(planId) || planId < 0 || planId > 32767)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid planId",
          message: "planId must be a valid plan id",
        },
        { status: 400 },
      );
    }

    const statusParam = searchParams.get("status")?.toUpperCase() || null;
    if (statusParam !== null && !SUBSCRIPTION_STATUSES.has(statusParam)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid status",
          message: "status must be one of ACTIVE, EXPIRED, NONE",
        },
        { status: 400 },
      );
    }

    // Pagination parameters
    const page = parsePage(searchParams.get("page"));
    const limit = clampLimit(searchParams.get("limit"));
    const offset = (page - 1) * limit;

    const rows = await callFunction<UserSubscriptionRow>({
      functionName: 'public."FetchUserSubscriptions"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [
        search, // p_search
        planId, // p_plan_id
        statusParam, // p_status
        offset, // p_row_start
        limit, // p_row_limit
      ],
      orderBy: false, // ordered by sign-up date inside the function
    });

    const total = rows.length > 0 ? Number(rows[0].TotalCount) : 0;
    const data = rows.map(({ TotalCount: _totalCount, ...row }) => row);

    return NextResponse.json(
      {
        success: true,
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching user subscriptions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch users",
        message: safeErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
