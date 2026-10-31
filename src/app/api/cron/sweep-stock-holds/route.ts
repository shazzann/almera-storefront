import { NextResponse } from "next/server";
import { sweepExpiredStockHolds } from "@/lib/payments-lk.server";

export async function GET(request: Request) {
  // If CRON_SECRET is configured, enforce authorization
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && cronSecret !== "dev_cron_secret") {
    const authHeader = request.headers.get("authorization");
    const bearer = authHeader?.replace(/^Bearer\s+/i, "");
    if (bearer !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await sweepExpiredStockHolds();
    return NextResponse.json({
      success: true,
      swept_count: result.sweptCount,
      order_numbers: result.orderNumbers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[cron/sweep-stock-holds] Error:", error);
    return NextResponse.json(
      { error: "Failed to sweep expired holds" },
      { status: 500 },
    );
  }
}
