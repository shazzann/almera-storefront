import type { AuthResult, CustomerAddressRecord } from "@/actions/auth";

export type AccountAddress = CustomerAddressRecord;

export type AccountItem = {
  id: string;
  product_slug: string;
  product_name: string;
  stitching: string;
  size: string | null;
  unit_price: number | string;
  quantity: number | string;
  image_url: string | null;
};

export type AccountOrder = {
  id: string;
  order_number: string;
  status: string;
  payment_method: string;
  total: number | string;
  subtotal: number | string;
  delivery_fee: number | string;
  discount_amount: number | string | null;
  coupon_code: string | null;
  advance_deposit: number | string | null;
  refund_amount: number | string | null;
  created_at: string;
  customer_name: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  postal_code: string | null;
  notes: string | null;
  order_items: AccountItem[];
};

export type AccountProfile = {
  name: string;
  email: string;
  phone: string;
  emailVerified: boolean;
  hasPassword: boolean;
  viaGoogle: boolean;
  lastSignIn: string | null;
};

export type AddressInput = {
  id?: string;
  label: string;
  recipientName: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  postalCode: string;
  isDefault: boolean;
};

type AddressResult = AuthResult<{ addresses: AccountAddress[] }>;

/** What the dashboard can do. The real site uses server actions, the preview uses sample data. */
export type AccountApi = {
  saveProfile(input: { fullName: string; phone: string }): Promise<AuthResult>;
  saveAddress(input: AddressInput): Promise<AddressResult>;
  setDefaultAddress(id: string): Promise<AddressResult>;
  deleteAddress(id: string): Promise<AddressResult>;
  changePassword(input: { current: string; next: string }): Promise<AuthResult>;
  sendPasswordLink(): Promise<AuthResult<{ message: string }>>;
  signOut(): Promise<void>;
  signOutEverywhere(): Promise<void>;
};
