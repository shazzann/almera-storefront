export const COD_DEPOSIT_THRESHOLD = 3000; // Orders > Rs. 3,000 require an advance deposit
export const COD_MIN_DEPOSIT = 500; // Minimum required commitment deposit (Rs. 500)

export const COD_DEPOSIT_BANK = {
  bank: process.env.NEXT_PUBLIC_BANK_NAME || "Hatton National Bank (HNB)",
  accountName: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME || "ALMERA APPAREL (PVT) LTD",
  accountNumber: process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER || "2500 2019 2261",
  branch: process.env.NEXT_PUBLIC_BANK_BRANCH || "Colombo 03",
} as const;

/**
 * Returns true when a Cash-on-Delivery order's final payable total
 * (after promo discounts and including delivery fee) exceeds Rs. 3,000.
 */
export function requiresCodDeposit(
  paymentMethod: string | null | undefined,
  finalPayableTotal: number,
): boolean {
  return (
    String(paymentMethod || "cod").toLowerCase() === "cod" &&
    finalPayableTotal > COD_DEPOSIT_THRESHOLD
  );
}

/**
 * Calculates the exact remaining amount to be collected by the courier on delivery.
 */
export function getCodBalanceDue(order: {
  total: number | string | null | undefined;
  refund_amount?: number | string | null;
  advance_deposit?: number | string | null;
}): number {
  return Math.max(
    0,
    Number(order.total ?? 0) -
      Number(order.refund_amount ?? 0) -
      Number(order.advance_deposit ?? 0),
  );
}

/**
 * Builds a WhatsApp link for customers to send their Rs. 500+ COD advance deposit slip.
 */
export function buildWhatsAppCodDepositUrl(
  orderNumber: string,
  total: number,
  customerName: string,
  depositAmount = COD_MIN_DEPOSIT,
): string {
  const phone = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "94771234567").replace(/\D/g, "");
  const balance = Math.max(0, total - depositAmount);
  const text = `Assalamu Alaikum / Hi almera! Here is the Rs. ${depositAmount.toLocaleString("en-LK")} COD advance deposit slip for my order *${orderNumber}* (${customerName}). Order total: Rs. ${total.toLocaleString("en-LK")} · Remaining COD balance on delivery: Rs. ${balance.toLocaleString("en-LK")}.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

