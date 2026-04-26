const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

/**
 * Call a Supabase Edge Function
 */
async function callEdgeFunction(name, body) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Edge function ${name} failed: ${res.status} — ${text}`);
  }

  return res.json();
}

/**
 * Look up a JAIDE user_id by Discord ID
 * Returns null if the user hasn't linked their account
 */
async function getJaideUserId(discordId) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?discord_id=eq.${discordId}&select=id&limit=1`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    }
  );
  const rows = await res.json();
  return rows?.[0]?.id ?? null;
}

module.exports = { callEdgeFunction, getJaideUserId };
