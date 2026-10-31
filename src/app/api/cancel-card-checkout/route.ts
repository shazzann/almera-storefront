import { handleCancelCardCheckout } from "@/lib/payments-lk.server";

export async function GET(request: Request) {
  return handleCancelCardCheckout(request);
}
