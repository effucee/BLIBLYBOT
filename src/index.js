require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  Events
} = require('discord.js');

const { callEdgeFunction, getJaideUserId } = require('./supabase');
const { handleBlibyMessage } = require('./blibly');

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
        `Head to your profile settings on **jaide.moe**, find "Link Discord Account", and enter this code.\n` +
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

  if (!userMessage) {
    await message.reply("Hey! What can I help you with? 😊");
    return;
  }

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
