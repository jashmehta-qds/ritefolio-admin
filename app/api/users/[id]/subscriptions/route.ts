import { NextRequest, NextResponse } from "next/server";
import { validate as isUuid } from "uuid";
import { requireAdmin, requireAdminUser } from "@/lib/auth/admin";
import { safeErrorMessage } from "@/lib/api/errors";
import { callFunction, callProcedure } from "@/utils/db";

interface PlanRow {
  Id: number;
  Name: string;
  IsActive: boolean | null;
}

interface SubscriptionHistoryRow {
  Id: string;
  PlanId: number;
  PlanName: string | null;
  IsActive: boolean;
  ExpiresAt: number | null;
  CreatedBy: string | null;
  CreatedOn: number;
  UpdatedOn: number | null;
}

interface UserOrderRow {
  Id: string;
  OrderType: "PLAN" | "ADDON";
  PlanId: number | null;
  PlanName: string | null;
  BillingCycle: string | null;
  BlockSize: number | null;
  Amount: string;
  Currency: string;
  Status: string;
  CreatedOn: number;
  UpdatedOn: number | null;
}

// GET: Fetch a user's subscription history and payment / add-on orders
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;

    if (!isUuid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid user id",
        },
        { status: 400 },
      );
    }

    const [subscriptions, orders] = await Promise.all([
      callFunction<SubscriptionHistoryRow>({
        functionName: 'public."FetchUserSubscriptionHistory"',
        dbName: process.env.PG_DEFAULT_DB,
        params: [id],
        orderBy: false,
      }),
      callFunction<UserOrderRow>({
        functionName: 'public."FetchUserOrders"',
        dbName: process.env.PG_DEFAULT_DB,
        params: [id],
        orderBy: false,
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: { subscriptions, orders },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching user subscription history:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch subscription history",
        message: safeErrorMessage(error),
      },
      { status: 500 },
    );
  }
}

// POST: Change a user's plan (e.g. grant Internal to staff) using ChangeSubscriptionPlan.
// Deactivates the current subscription and inserts the new one, recording the admin
// as CreatedBy. Body: { planId: number, expiresAt: number | null } (epoch seconds;
// null = never expires).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user: admin, denied } = await requireAdminUser();
  if (denied) return denied;

  try {
    const { id } = await params;
    if (!isUuid(id)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid user id",
        },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { planId, expiresAt = null } = body ?? {};

    if (!Number.isInteger(planId) || planId < 0 || planId > 32767) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid planId",
          message: "planId must be a valid plan id",
        },
        { status: 400 },
      );
    }

    const nowEpoch = Math.floor(Date.now() / 1000);
    if (
      expiresAt !== null &&
      (!Number.isInteger(expiresAt) ||
        expiresAt <= nowEpoch ||
        expiresAt > 2147483647)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid expiresAt",
          message: "Expiry must be a future date, or null for never",
        },
        { status: 400 },
      );
    }

    const plans = await callFunction<PlanRow>({
      functionName: 'public."FetchPlans"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [planId, true], // p_plan_id, p_is_active
      orderBy: false,
    });
    if (plans.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Plan not found",
          message: "The selected plan does not exist or is inactive",
        },
        { status: 400 },
      );
    }

    await callProcedure({
      procedureName: 'ritefolio."ChangeSubscriptionPlan"',
      dbName: process.env.PG_DEFAULT_DB,
      params: [id, planId, expiresAt, admin.id], // p_user_id, p_plan_id, p_expires_at, p_created_by
    });

    return NextResponse.json(
      {
        success: true,
        message: `Plan changed to ${plans[0].Name}`,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error changing user plan:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to change plan",
        message: safeErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
