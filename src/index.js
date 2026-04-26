require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  Events
} = require('discord.js');

const { callEdgeFunction, getJaideUserId } = require('./supabase');
const { handleBlibyMessage, UNLINKED_MESSAGE } = require('./blibly');

const promptedUnlinkedUsers = new Set();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message]
});

// ─── Ready ───────────────────────────────────────────────────────────────────

client.once(Events.ClientReady, () => {
  console.log(`Blibly is online as ${client.user.tag}`);
});

// ─── Slash Commands ───────────────────────────────────────────────────────────

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // ── /link ──
  if (interaction.commandName === 'link') {
    try {
      const { code } = await callEdgeFunction('discord-generate-link-code', {
        discord_id: interaction.user.id
      });

      await interaction.user.send(
        `👋 Your JAIDE link code is: **${code}**\n\n` +
        `Head to your profile settings on **jaide.net**, find "Link Discord Account", and enter this code.\n` +
        `⏱️ This code expires in **15 minutes**.`
      );

      await interaction.reply({
        content: "I've sent you a DM with your link code!",
        ephemeral: true
      });
    } catch (err) {
      console.error('/link error:', err);
      await interaction.reply({
        content: "Something went wrong generating your link code. Please try again!",
        ephemeral: true
      });
    }
    return;
  }

  // ── /unlink ──
  if (interaction.commandName === 'unlink') {
    try {
      const user_id = await getJaideUserId(interaction.user.id);
      if (!user_id) {
        await interaction.reply({
          content: "Your Discord account isn't linked to a JAIDE profile.",
          ephemeral: true
        });
        return;
      }

      await callEdgeFunction('discord-unlink', {
        discord_id: interaction.user.id
      });

      await interaction.reply({
        content: "Your Discord account has been unlinked from JAIDE.",
        ephemeral: true
      });
    } catch (err) {
      console.error('/unlink error:', err);
      await interaction.reply({
        content: "Something went wrong. Please try again!",
        ephemeral: true
      });
    }
    return;
  }

  // ── /blibly ──
  if (interaction.commandName === 'blibly') {
    const userMessage = interaction.options.getString('message');
    await interaction.deferReply();

    await handleBlibyMessage(
      userMessage,
      interaction.user.id,
      { channelId: interaction.channelId, guildId: interaction.guildId },
      async (text, isFollowUp = false) => {
        if (isFollowUp) {
          await interaction.followUp(text);
        } else {
          await interaction.editReply(text);
        }
      },
      async () => {} // typing handled by deferReply
    );
    return;
  }
});

// ─── Link/Unlink helpers ──────────────────────────────────────────────────────

async function handleLinkKeyword(message) {
  try {
    const { code } = await callEdgeFunction('discord-generate-link-code', {
      discord_id: message.author.id
    });

    await message.author.send(
      `👋 Your JAIDE link code is: **${code}**\n\n` +
      `Head to your profile settings on **jaide.net**, find "Link Discord Account", and enter this code.\n` +
      `⏱️ This code expires in **15 minutes**.`
    );

    return true;
  } catch (err) {
    console.error('Link keyword error:', err);
    await message.reply("Something went wrong generating your link code. Please try again!");
    return false;
  }
}

async function handleUnlinkKeyword(message) {
  try {
    const user_id = await getJaideUserId(message.author.id);
    if (!user_id) {
      await message.reply("Your Discord account isn't linked to a JAIDE profile.");
      return;
    }
    await callEdgeFunction('discord-unlink', { discord_id: message.author.id });
    await message.reply("Your Discord account has been unlinked from JAIDE!");
  } catch (err) {
    console.error('Unlink keyword error:', err);
    await message.reply("Something went wrong. Please try again!");
  }
}

// ─── Message Events (@ mentions + DMs) ───────────────────────────────────────

client.on(Events.MessageCreate, async message => {
  // Ignore bots
  if (message.author.bot) return;

  const isMention = message.mentions.has(client.user);
  const isDM = !message.guildId;

  if (!isMention && !isDM) return;

  // Strip the @mention from the message content
  const userMessage = message.content
    .replace(`<@${client.user.id}>`, '')
    .replace(`<@!${client.user.id}>`, '')
    .trim();

  console.log(`[MessageCreate] userMessage: "${userMessage}" normalized: "${userMessage.toLowerCase()}"`);

  if (!userMessage) {
    await message.reply("Hey! What can I help you with? 😊");
    return;
  }

  const normalized = userMessage.toLowerCase();

  // ── Keyword: link ──
  if (normalized === 'link') {
    const success = await handleLinkKeyword(message);
    if (success && isMention) {
      await message.reply("I've sent you a DM with your link code! 📬");
    }
    return;
  }

  // ── Keyword: unlink ──
  if (normalized === 'unlink') {
    await handleUnlinkKeyword(message);
    return;
  }

  const user_id = await getJaideUserId(message.author.id);

  // Smart link detection for unlinked users
  if (!user_id && normalized.includes('link')) {
    const success = await handleLinkKeyword(message);
    if (success) {
      await message.reply(
        "_(Looks like you mentioned \"link\" — so I went ahead and sent you a code! " +
        "Sorry if that wasn't what you meant!)_"
      );
    }
    return;
  }

  // First-time unlinked user prompt
  const isFirstTime = !promptedUnlinkedUsers.has(message.author.id);
  if (!user_id && isFirstTime) {
    promptedUnlinkedUsers.add(message.author.id);
    await message.reply(UNLINKED_MESSAGE);
    return;
  }

  // ── Everything else → Blibly response ──
  await handleBlibyMessage(
    userMessage,
    message.author.id,
    { channelId: message.channelId, guildId: message.guildId },
    async (text, isFollowUp = false) => {
      if (isFollowUp) {
        await message.channel.send(text);
      } else {
        await message.reply(text);
      }
    },
    async () => {
      await message.channel.sendTyping();
    }
  );
});

// ─── Login ────────────────────────────────────────────────────────────────────

client.login(process.env.DISCORD_TOKEN);
