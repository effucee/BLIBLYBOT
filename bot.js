import OpenAI from "openai";
import { Client, GatewayIntentBits, Events } from "discord.js";

// ── Config ────────────────────────────────────────────────────────────────────
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = "anthropic/claude-haiku-4-5";
const MAX_HISTORY = 10; // messages kept per channel (user + assistant pairs)
const SYSTEM_PROMPT =
  "You are Blibly, a friendly and helpful Discord bot. Keep your replies concise and conversational.";

// ── Clients ───────────────────────────────────────────────────────────────────
const openrouter = new OpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

const discord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ── Per-channel conversation history ─────────────────────────────────────────
// Map<channelId, Array<{role, content}>>
const histories = new Map();

function getHistory(channelId) {
  if (!histories.has(channelId)) histories.set(channelId, []);
  return histories.get(channelId);
}

function trimHistory(history) {
  // Keep only the last MAX_HISTORY messages (each turn = 2 entries)
  const limit = MAX_HISTORY * 2;
  if (history.length > limit) history.splice(0, history.length - limit);
}

// ── Discord event handlers ────────────────────────────────────────────────────
discord.once(Events.ClientReady, (client) => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

discord.on(Events.MessageCreate, async (message) => {
  // Ignore bots and messages that don't mention us
  if (message.author.bot) return;
  if (!message.mentions.has(discord.user)) return;

  // Strip the bot mention from the message text
  const userText = message.content
    .replace(/<@!?[\d]+>/g, "")
    .trim();

  if (!userText) {
    await message.reply("Hey! Ping me with a message and I'll respond 😊");
    return;
  }

  const history = getHistory(message.channelId);

  // Add user turn
  history.push({ role: "user", content: userText });
  trimHistory(history);

  // Show typing indicator while we wait
  await message.channel.sendTyping();

  try {
    const response = await openrouter.chat.completions.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...history,
      ],
    });

    const reply = response.choices[0]?.message?.content ?? "";

    // Add assistant turn to history
    history.push({ role: "assistant", content: reply });
    trimHistory(history);

    // Discord messages max out at 2000 chars — chunk if needed
    if (reply.length <= 2000) {
      await message.reply(reply);
    } else {
      const chunks = reply.match(/[\s\S]{1,2000}/g) ?? [];
      for (const chunk of chunks) {
        await message.channel.send(chunk);
      }
    }
  } catch (err) {
    console.error("OpenRouter API error:", err);
    await message.reply(
      "Sorry, something went wrong on my end. Please try again!"
    );
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
discord.login(DISCORD_TOKEN);
