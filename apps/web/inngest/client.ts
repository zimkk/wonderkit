import { Inngest } from "inngest";
import { env } from "@/env";

/** Shared Inngest client. Import this — never instantiate Inngest elsewhere. */
export const inngest = new Inngest({
  id: "wonderkit",
  eventKey: env.INNGEST_EVENT_KEY ?? "local",
});
