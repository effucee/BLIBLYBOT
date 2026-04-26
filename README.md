# Blibly Discord Bot

Blibly is JAIDE's Discord assistant, powered by the `blibly` Supabase Edge Function.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Copy `.env.example` to `.env` and fill in the values:
```bash
cp .env.example .env
```

| Variable | Where to find it |
|---|---|
| `DISCORD_TOKEN` | Discord Developer Portal → Your App → Bot → Token |
| `DISCORD_CLIENT_ID` | Discord Developer Portal → Your App → General Information → Application ID |
| `SUPABASE_URL` | `https://mtuuwkyqqzofcpxnbccq.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → anon public key |

### 3. Register slash commands (run once)
```bash
node src/register-commands.js
```

### 4. Run the bot
```bash
npm start
```

---

## Railway Deployment

1. Push this folder to a GitHub repo (or upload directly to Railway)
2. Create a new Railway project → Deploy from GitHub repo
3. Add the environment variables in Railway's **Variables** tab:
   - `DISCORD_TOKEN`
   - `DISCORD_CLIENT_ID`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
4. Railway will automatically run `npm start`

> ⚠️ Run `node src/register-commands.js` **once** locally before deploying to register slash commands with Discord. You only need to do this once (or when adding new commands).

---

## Discord Bot Permissions

When inviting the bot to your server, make sure it has these permissions:
- Read Messages / View Channels
- Send Messages
- Send Messages in Threads
- Read Message History
- Mention Everyone (optional)

And these **Privileged Gateway Intents** enabled in the Developer Portal:
- Message Content Intent

---

## Features

| Trigger | Behavior |
|---|---|
| `@Blibly <message>` | Blibly responds in the channel |
| DM to Blibly | Blibly responds in the DM |
| `/blibly <message>` | Slash command, ephemeral option available |
| `/link` | Generates a code to link JAIDE account |
| `/unlink` | Unlinks JAIDE account |

Linked users get persistent personalized chat history. Unlinked users still get full Blibly responses, just without history across sessions.
