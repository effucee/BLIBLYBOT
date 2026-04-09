# Blibly Discord Bot

A simple Discord bot powered by Claude Haiku via OpenRouter. Mention the bot in any channel and it'll respond, remembering the last 10 messages of conversation per channel.

---

## What You'll Need

- A free [GitHub](https://github.com) account
- A free [Railway](https://railway.app) account
- A free [Discord](https://discord.com/developers/applications) developer account
- An [OpenRouter](https://openrouter.ai) account (free to sign up, pay per use)

---

## Step 1 — Create the Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and click **New Application**. Give it a name (e.g. "Blibly").
2. Go to the **Bot** tab on the left → click **Add Bot** → confirm.
3. Scroll down to **Privileged Gateway Intents** and turn on **Message Content Intent**. Hit **Save Changes**.
4. Click **Reset Token**, copy the token, and save it somewhere safe — you'll need it in Step 4.
5. Go to **OAuth2 → URL Generator** on the left:
   - Under **Scopes**, check `bot`
   - Under **Bot Permissions**, check: `Send Messages`, `Read Message History`, `View Channels`
6. Copy the URL at the bottom and open it in your browser to invite Blibly to your server.

---

## Step 2 — Get Your OpenRouter API Key

1. Sign up at [openrouter.ai](https://openrouter.ai)
2. Go to **Keys** in your account and click **Create Key**
3. Copy the key — you'll need it in Step 4

> OpenRouter charges per token used. Claude Haiku is one of the cheapest models available, so casual bot usage will cost very little.

---

## Step 3 — Put the Code on GitHub

1. Create a new **public** repository on GitHub (e.g. `blibly-bot`)
2. Add these two files to it:
   - `bot.js` (the bot file)
   - `package.json` (see below)

**`package.json`** — create this file in your repo with the following content:

```json
{
  "name": "blibly-bot",
  "version": "1.0.0",
  "type": "module",
  "main": "bot.js",
  "scripts": {
    "start": "node bot.js"
  },
  "dependencies": {
    "discord.js": "^14.0.0",
    "openai": "^4.0.0"
  }
}
```

You can add files directly on GitHub by clicking **Add file → Create new file** — no need to use the terminal.

---

## Step 4 — Deploy on Railway

1. Sign up at [railway.app](https://railway.app) and log in with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select your `blibly-bot` repository
4. Once it loads, click on your service → go to the **Variables** tab
5. Add these two environment variables:

| Name | Value |
|---|---|
| `DISCORD_TOKEN` | Your Discord bot token from Step 1 |
| `OPENROUTER_API_KEY` | Your OpenRouter key from Step 2 |

6. Go to the **Settings** tab and make sure the **Start Command** is set to `node bot.js`
7. Railway will automatically deploy — watch the **Logs** tab for:
   ```
   ✅ Logged in as Blibly#1234
   ```

That's it! Go to your Discord server, @ mention the bot, and it'll respond. 🎉

---

## Customization

All the easy-to-change settings are at the top of `bot.js`:

| What | Variable |
|---|---|
| Bot personality | `SYSTEM_PROMPT` |
| How many messages it remembers | `MAX_HISTORY` |
| Max response length | `max_tokens` |

---

## Notes

- History is stored **in memory** — it resets when the bot restarts. For persistent memory across restarts, a database (like Supabase) would be needed.
- Each channel gets its own independent conversation history.
- Railway's free tier should be more than enough for a small bot. If you exceed it, their paid plans are very affordable.
