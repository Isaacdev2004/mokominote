import { eq } from "drizzle-orm";
import { db, transactionsTable } from "@workspace/db";
import { DevPaymentProvider } from "./dev.service";
import { PAYMENT_PRODUCTS, WhopPaymentProvider } from "./whop.service";
import type { CheckoutRequest, CheckoutResult, PaymentProduct, PaymentProvider } from "./payment.types";

function activeProvider(): PaymentProvider {
  return process.env.PAYMENT_PROVIDER === "whop" ? new WhopPaymentProvider() : new DevPaymentProvider();
}

export function listPaymentProducts(): PaymentProduct[] {
  return activeProvider().listProducts();
}

export async function createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
  const provider = activeProvider();
  const product = PAYMENT_PRODUCTS.find((item) => item.id === request.productId);
  if (!product) throw new Error("Unknown payment product.");
  const checkout = await provider.createCheckout(request);
  await db.insert(transactionsTable).values({
    id: checkout.transactionId,
    userId: request.userId,
    businessId: request.businessId ?? null,
    provider: checkout.provider,
    providerTransactionId: checkout.provider === "dev" ? checkout.transactionId : null,
    type: product.type,
    amount: product.amount,
    currency: product.currency,
    status: checkout.status,
    metadata: { productId: product.id, mode: checkout.mode },
  });
  return checkout;
}

export async function markTransactionPaid(transactionId: string, providerTransactionId?: string) {
  const [updated] = await db
    .update(transactionsTable)
    .set({
      status: "paid",
      providerTransactionId: providerTransactionId ?? transactionId,
      updatedAt: new Date(),
    })
    .where(eq(transactionsTable.id, transactionId))
    .returning();
  return updated;
}

export function paymentMode(): "live" | "development" {
  return process.env.PAYMENT_PROVIDER === "whop" && process.env.WHOP_API_KEY ? "live" : "development";
}
