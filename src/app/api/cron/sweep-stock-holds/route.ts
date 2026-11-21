import { NextResponse } from "next/server";
import { purgeExpiredPaymentProofs } from "@/lib/payment-proofs.server";
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
    const [result, purgeResult] = await Promise.all([
      sweepExpiredStockHolds(),
      purgeExpiredPaymentProofs(),
    ]);
    return NextResponse.json({
      success: true,
      swept_count: result.sweptCount,
      order_numbers: result.orderNumbers,
      purged_proofs_count: purgeResult.purgedCount,
      purged_proof_orders: purgeResult.orderNumbers,
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
