# Payments

The business model includes listing fees, sponsored placements, and later premium services. **Whop** is the intended provider.

## Design

- `payment.types.ts` — provider interface
- `whop.service.ts` — live provider adapter (requires official credentials)
- `dev.service.ts` — development adapter
- `payment.service.ts` — application entry point that writes `mokominote_transactions`

The rest of the app never talks to Whop directly.

## Modes

| Mode | When | Behaviour |
| --- | --- | --- |
| `development` | `PAYMENT_PROVIDER=dev` or missing Whop keys | Creates a **pending** transaction. Does not mark it paid. |
| `live` | `PAYMENT_PROVIDER=whop` and `WHOP_API_KEY` | Ready for official Whop checkout/webhooks. Not enabled until credentials exist. |

The UI shows the active mode and never displays a fake “payment successful” state.

## Webhooks

Successful external payments must come from a verified webhook, not from the browser. `WHOP_WEBHOOK_SECRET` is required before a live webhook is accepted.
