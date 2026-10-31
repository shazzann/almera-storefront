import { handlePaymentsLkWebhook } from "@/lib/payments-lk.server";

export async function POST(request: Request) {
  return handlePaymentsLkWebhook(request);
}
