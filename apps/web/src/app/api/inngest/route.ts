import { serve } from "inngest/next";
import { inngest } from "@/../../inngest/client";
import { usageRollup } from "@/../../inngest/functions/usage-rollup";
import { onPaymentFailed, onSubscriptionProvisioned } from "@/../../inngest/functions/billing-events";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [usageRollup, onPaymentFailed, onSubscriptionProvisioned],
});
