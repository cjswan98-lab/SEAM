// Shared helpers. Lives outside netlify/functions so Netlify doesn't try to
// deploy it as a function of its own.

export function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", ...extra },
  });
}

// Returns a Response when the caller should be rejected, otherwise null.
export function guard(request) {
  const expected = process.env.SEAM_PASSCODE;
  if (!expected) return null; // open deployment — see README
  if (request.headers.get("x-seam-key") !== expected) {
    return json({ error: "Bad passcode." }, 401);
  }
  return null;
}
