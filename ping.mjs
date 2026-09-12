import { guard, json } from "../lib/util.mjs";

export default async (request) => {
  if (request.method !== "POST") return json({ error: "POST only." }, 405);
  const gate = guard(request);
  if (gate) return gate;
  return json({ ok: true, x: !!process.env.X_BEARER_TOKEN });
};

export const config = { path: "/api/ping" };
