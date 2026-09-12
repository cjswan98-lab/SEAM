// POST /api/claude  { prompt }  ->  { text }
//
// The API key lives in the Netlify environment and never reaches the browser.

import { guard, json } from "../lib/util.mjs";

export default async (request) => {
  if (request.method !== "POST") return json({ error: "POST only." }, 405);
  const gate = guard(request);
  if (gate) return gate;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Bad request body." }, 400);
  }

  const prompt = String(body.prompt || "");
  if (!prompt) return json({ error: "No prompt supplied." }, 400);

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json({ error: "ANTHROPIC_API_KEY is not set on this site." }, 500);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || "claude-sonnet-5",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }],
    }),
  });

  // Pass rate limits through so the browser can back off intelligently.
  if (res.status === 429 || res.status === 529 || res.status >= 500) {
    return json({ error: "upstream busy" }, res.status, {
      "retry-after": res.headers.get("retry-after") || "10",
    });
  }

  if (!res.ok) {
    const detail = await res.text();
    return json({ error: detail.slice(0, 300) }, res.status);
  }

  const data = await res.json();
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  return json({ text });
};

export const config = { path: "/api/claude" };
