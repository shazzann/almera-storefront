import { COD_DEPOSIT_BANK, buildWhatsAppCodDepositUrl } from "./cod-deposit";

export const BANK_DETAILS = {
  bankName: COD_DEPOSIT_BANK.bank,
  accountName: COD_DEPOSIT_BANK.accountName,
  accountNumber: COD_DEPOSIT_BANK.accountNumber,
  branch: COD_DEPOSIT_BANK.branch,
};

export { buildWhatsAppCodDepositUrl };

export function buildWhatsAppBankSlipUrl(
  orderNumber: string,
  total: number,
  customerName: string,
): string {
  const phone = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "94771234567").replace(/\D/g, "");
  const text = `Assalamu Alaikum / Hi almera! Here is the bank transfer slip for my order *${orderNumber}* (${customerName} — Rs. ${total.toLocaleString("en-LK")}).`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
