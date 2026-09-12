// POST /api/x  { countries: [...] }  ->  { configured, posts[] }
//
// Reads X's recent-search endpoint. This needs a PAID X API tier — the free
// tier has no search access at all. Without X_BEARER_TOKEN this answers
// { configured: false } and the app falls back to web search.

import { guard, json } from "../lib/util.mjs";

// X caps a query at 512 characters on Basic, so these stay tight.
const COMMODITIES =
  '(copper OR cobalt OR "coking coal" OR "thermal coal" OR chrome OR manganese OR lithium OR platinum)';
const POWER = '(solar OR hydropower OR IPP OR "power purchase" OR grid OR "load shedding")';
const LOGISTICS =
  '(Lobito OR Transnet OR "Richards Bay" OR "Walvis Bay" OR Beira OR Nacala OR "Dar es Salaam" OR offtake)';
const CAPITAL =
  '(investment OR financing OR "project finance" OR MoU OR stake OR Afreximbank OR AfDB OR "Exim Bank")';

// THE KNOB THAT MATTERS. Keyword search on X is mostly noise; a curated list of
// accounts that actually break regional news is signal. Replace these with the
// journalists, analysts, company and ministry handles you already follow.
const ACCOUNTS = [
  "MiningWeekly", "MiningmxSA", "ReutersAfrica", "AfricaBusiness", "ESIAfrica",
  "miningdotcom", "AfDB_Group", "Afreximbank", "IFC_org", "TransnetSOC",
];

function buildQueries(countries) {
  const named = countries.length && countries.length < 26 ? countries : [];
  const places = (named.length ? named : [
    "Zambia", "DRC", "Congo", "South Africa", "Zimbabwe",
    "Mozambique", "Tanzania", "Namibia", "Botswana", "Angola",
  ]).slice(0, 8).map((c) => (c.includes(" ") ? `"${c}"` : c)).join(" OR ");

  const region = `(${places})`;
  const base = "-is:retweet -is:reply lang:en";

  return [
    `${COMMODITIES} ${region} ${base}`,
    `${POWER} ${region} ${base}`,
    `${LOGISTICS} ${base}`,
    `${CAPITAL} ${region} ${base}`,
    `(from:${ACCOUNTS.join(" OR from:")}) -is:retweet`,
  ].filter((q) => q.length <= 512);
}

export default async (request) => {
  if (request.method !== "POST") return json({ error: "POST only." }, 405);
  const gate = guard(request);
  if (gate) return gate;

  const token = process.env.X_BEARER_TOKEN;
  if (!token) {
    return json({
      configured: false,
      note: "No X_BEARER_TOKEN set. X search needs a paid API tier.",
    });
  }

  let countries = [];
  try {
    countries = (await request.json()).countries || [];
  } catch {
    /* defaults are fine */
  }

  const seen = new Set();
  const posts = [];
  let lastError = null;

  for (const q of buildQueries(countries)) {
    const url = new URL("https://api.x.com/2/tweets/search/recent");
    url.searchParams.set("query", q);
    url.searchParams.set("max_results", "20");
    url.searchParams.set("tweet.fields", "created_at,public_metrics,author_id");
    url.searchParams.set("expansions", "author_id");
    url.searchParams.set("user.fields", "username,name,verified");

    const res = await fetch(url, { headers: { authorization: "Bearer " + token } });

    if (res.status === 429) { lastError = "X rate limit reached — partial results."; break; }
    if (!res.ok) {
      lastError = "X returned " + res.status + ". Check the token's access tier.";
      continue;
    }

    const data = await res.json();
    const users = Object.fromEntries(
      ((data.includes && data.includes.users) || []).map((u) => [u.id, u])
    );

    for (const t of data.data || []) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
      const u = users[t.author_id] || {};
      const m = t.public_metrics || {};
      posts.push({
        handle: u.username || "unknown",
        name: u.name || "",
        text: t.text || "",
        date: (t.created_at || "").slice(0, 10),
        likes: m.like_count || 0,
        reposts: m.retweet_count || 0,
        url: "https://x.com/" + (u.username || "i") + "/status/" + t.id,
      });
    }
  }

  // Engagement is a crude relevance proxy, but it beats recency alone.
  posts.sort((a, b) => b.reposts + b.likes - (a.reposts + a.likes));

  if (!posts.length && lastError) return json({ configured: true, error: lastError }, 502);
  return json({ configured: true, posts: posts.slice(0, 60), note: lastError });
};

export const config = { path: "/api/x" };
