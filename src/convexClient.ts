import { ConvexReactClient } from "convex/react";

const convexUrl =
  (import.meta.env.VITE_CONVEX_URL as string) ||
  "https://precise-possum-553.convex.cloud";

export const convexClient = new ConvexReactClient(convexUrl);

