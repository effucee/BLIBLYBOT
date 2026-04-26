const { callEdgeFunction, getJaideUserId } = require('./supabase');

const DISCORD_MSG_LIMIT = 1900;

const UNLINKED_MESSAGE =
  `Hey! 👋 I can chat with you, but to get the full experience — including personalized memory across our conversations — you'll want to link your JAIDE account first!\n\n` +
  `Just send me **"link"** in a DM, or **@Blibly link** here, and I'll send you a code to connect your account at **jaide.net**. 🔗\n\n` +
  `Otherwise, feel free to ask me anything!`;

/**
 * Send a message to the Blibly Edge Function and reply in Discord.
 * Works for both slash commands and direct/mention messages.
 *
 * @param {string} userMessage - The user's message text
 * @param {string} discordUserId - The Discord snowflake ID
 * @param {object} discordContext - { channelId, guildId }
 * @param {Function} reply - Async function to send the reply back to Discord
 * @param {Function} sendTyping - Async function to show typing indicator
 */
async function handleBlibyMessage(userMessage, discordUserId, discordContext, reply, sendTyping) {
  try {
    await sendTyping();

    const user_id = await getJaideUserId(discordUserId);

    const context = {
      page: 'discord',
      channel: discordContext.channelId,
      guild: discordContext.guildId ?? 'dm'
    };

    const { reply: blibyReply } = await callEdgeFunction('blibly', {
      messages: [{ role: 'user', content: userMessage }],
      context,
      source: 'discord',
      user_id
    });

    // Split response if it exceeds Discord's character limit
    if (blibyReply.length <= DISCORD_MSG_LIMIT) {
      await reply(blibyReply);
    } else {
      const chunks = blibyReply.match(new RegExp(`.{1,${DISCORD_MSG_LIMIT}}`, 'gs')) ?? [];
      for (let i = 0; i < chunks.length; i++) {
        await reply(chunks[i], i > 0);
      }
    }
  } catch (err) {
    console.error('Blibly handler error:', err);
    await reply("Sorry, I'm having a bit of trouble right now. Try again in a moment!");
  }
}

module.exports = { handleBlibyMessage, UNLINKED_MESSAGE };
