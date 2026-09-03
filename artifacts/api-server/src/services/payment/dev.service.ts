import type { CheckoutRequest, CheckoutResult, PaymentProduct, PaymentProvider, WebhookResult } from "./payment.types";
import { PAYMENT_PRODUCTS } from "./whop.service";

export class DevPaymentProvider implements PaymentProvider {
  readonly name = "dev" as const;

  listProducts(): PaymentProduct[] {
    return PAYMENT_PRODUCTS;
  }

  async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    const product = PAYMENT_PRODUCTS.find((item) => item.id === request.productId);
    if (!product) throw new Error("Unknown payment product.");
    return {
      transactionId: crypto.randomUUID(),
      checkoutUrl: null,
      status: "pending",
      provider: "dev",
      mode: "development",
    };
  }

  async handleWebhook(): Promise<WebhookResult> {
    return { accepted: false };
  }
}
