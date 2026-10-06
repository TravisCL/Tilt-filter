// Called once right after a user signs in with Discord. Takes the Discord
// provider token from that OAuth session, checks whether the user currently
// holds the premium role in Travis's server, and stamps the result onto the
// user's own metadata so the app can gate access without re-calling this on
// every page load — only re-verified on each fresh sign-in.
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const DISCORD_GUILD_ID = Deno.env.get("DISCORD_GUILD_ID") ?? "";
const DISCORD_PREMIUM_ROLE_ID = Deno.env.get("DISCORD_PREMIUM_ROLE_ID") ?? "";

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "");
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt);
  if (userError || !userData?.user) {
    return Response.json({ access: false, reason: "not signed in" }, { status: 401 });
  }
  const userId = userData.user.id;

  const { discordAccessToken } = await req.json();
  if (!discordAccessToken) {
    return Response.json({ access: false, reason: "missing discord token" }, { status: 400 });
  }

  const memberRes = await fetch(
    `https://discord.com/api/users/@me/guilds/${DISCORD_GUILD_ID}/member`,
    { headers: { Authorization: `Bearer ${discordAccessToken}` } },
  );

  if (!memberRes.ok) {
    // Not a member of the server at all (404), or token lacked the scope.
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { discord_role_verified: false, discord_verified_at: new Date().toISOString() },
    });
    return Response.json({ access: false, reason: "not a member of the server" }, { status: 200 });
  }

  const member = await memberRes.json();
  const roles: string[] = member.roles ?? [];
  const hasRole = roles.includes(DISCORD_PREMIUM_ROLE_ID);

  await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: { discord_role_verified: hasRole, discord_verified_at: new Date().toISOString() },
  });

  return Response.json({ access: hasRole, reason: hasRole ? null : "missing premium role" }, { status: 200 });
});
