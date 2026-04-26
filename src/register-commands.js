// Run this once to register slash commands with Discord:
// node src/register-commands.js

require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link your Discord account to your JAIDE profile')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('unlink')
    .setDescription('Unlink your Discord account from your JAIDE profile')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('blibly')
    .setDescription('Ask Blibly something')
    .addStringOption(opt =>
      opt.setName('message')
        .setDescription('Your message to Blibly')
        .setRequired(true)
    )
    .toJSON(),
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commands }
    );
    console.log('Slash commands registered!');
  } catch (err) {
    console.error(err);
  }
})();
