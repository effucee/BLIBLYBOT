import OpenAI from "openai";
import { Client, GatewayIntentBits, Events } from "discord.js";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const config = require("./config.json");

// ── Config ────────────────────────────────────────────────────────────────────
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const { model, maxHistory, maxTokens, systemPrompt } = config;

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
  const limit = maxHistory * 2;
  if (history.length > limit) history.splice(0, history.length - limit);
}

// ── Discord event handlers ────────────────────────────────────────────────────
discord.once(Events.ClientReady, (client) => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`   Model:      ${model}`);
  console.log(`   MaxHistory: ${maxHistory} messages`);
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
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
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
