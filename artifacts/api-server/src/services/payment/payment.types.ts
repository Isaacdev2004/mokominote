export type PaymentProviderName = "whop" | "dev";

export type PaymentProduct = {
  id: string;
  name: string;
  description: string;
  type: "listing" | "sponsored" | "premium";
  amount: number;
  currency: string;
};

export type CheckoutRequest = {
  productId: string;
  userId: string;
  businessId?: string;
};

export type CheckoutResult = {
  transactionId: string;
  checkoutUrl: string | null;
  status: "pending" | "paid" | "failed";
  provider: PaymentProviderName;
  mode: "live" | "development";
};

export type WebhookResult = {
  accepted: boolean;
  transactionId?: string;
  status?: string;
};

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  listProducts(): PaymentProduct[];
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
  handleWebhook(rawBody: string, signature: string | undefined): Promise<WebhookResult>;
}
