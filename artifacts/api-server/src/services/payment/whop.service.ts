import type { CheckoutRequest, CheckoutResult, PaymentProduct, PaymentProvider, WebhookResult } from "./payment.types";
import { createHmac, timingSafeEqual } from "node:crypto";

const PRODUCTS: PaymentProduct[] = [
  {
    id: "listing-annual",
    name: "Annual business listing",
    description: "Keep your business discoverable on MoKominoté for twelve months.",
    type: "listing",
    amount: 250000,
    currency: "MUR",
  },
  {
    id: "sponsored-sidebar",
    name: "Sponsored sidebar",
    description: "A featured placement beside the directory for one month.",
    type: "sponsored",
    amount: 180000,
    currency: "MUR",
  },
  {
    id: "premium-spotlight",
    name: "Premium spotlight",
    description: "Homepage and directory spotlight for two weeks.",
    type: "premium",
    amount: 420000,
    currency: "MUR",
  },
];

export class WhopPaymentProvider implements PaymentProvider {
  readonly name = "whop" as const;

  listProducts(): PaymentProduct[] {
    return PRODUCTS;
  }

  async createCheckout(_request: CheckoutRequest): Promise<CheckoutResult> {
    if (!process.env.WHOP_API_KEY) {
      throw new Error("WHOP_API_KEY is not configured. Use PAYMENT_PROVIDER=dev until live credentials are available.");
    }
    throw new Error("Live Whop checkout is not enabled in this MVP environment.");
  }

  async handleWebhook(rawBody: string, signature: string | undefined): Promise<WebhookResult> {
    const secret = process.env.WHOP_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error("WHOP_WEBHOOK_SECRET is not configured.");
    }
    if (!signature) return { accepted: false };
    const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
    const left = Buffer.from(digest);
    const right = Buffer.from(signature);
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      return { accepted: false };
    }
    return { accepted: true };
  }
}

export { PRODUCTS as PAYMENT_PRODUCTS };
