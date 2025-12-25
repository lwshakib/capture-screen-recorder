import { Inngest } from "inngest";
// ℹ️ Import the middleware from the middleware sub-package:
import { realtimeMiddleware } from "@inngest/realtime/middleware";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "capture-screen-recorder", middleware: [realtimeMiddleware()],  });