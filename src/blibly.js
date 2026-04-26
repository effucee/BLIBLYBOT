const { callEdgeFunction, getJaideUserId } = require('./supabase');

const DISCORD_MSG_LIMIT = 1900;

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

    // Split response if it exceeds Discord's 2000 char limit
    if (blibyReply.length <= DISCORD_MSG_LIMIT) {
      await reply(blibyReply);
    } else {
      const chunks = blibyReply.match(new RegExp(`.{1,${DISCORD_MSG_LIMIT}}`, 'gs')) ?? [];
      for (let i = 0; i < chunks.length; i++) {
        await reply(chunks[i], i > 0); // after first chunk, send as follow-up
      }
    }
  } catch (err) {
    console.error('Blibly handler error:', err);
    await reply("Sorry, I'm having a bit of trouble right now. Try again in a moment!");
  }
}

module.exports = { handleBlibyMessage };
