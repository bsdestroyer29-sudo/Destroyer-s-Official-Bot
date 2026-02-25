import { PermissionsBitField } from "discord.js";

const NEWS_CHANNEL_ID = "1475507415205154847";
const PING_ROLE_ID = "1475500970518515753";

export default {
  name: "messageCreate",
  once: false,

  async execute(message, client) {

    if (!message.guild) return;
    if (message.author.bot) return;

    // Only watch news channel
    if (message.channel.id !== NEWS_CHANNEL_ID) return;

    const member = message.member;

    // Only mods/staff trigger auto ping
    if (!member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;

    // Check if role was already mentioned
    const mentioned = message.mentions.roles.has(PING_ROLE_ID);

    if (mentioned) return; // Ping already worked

    // Send fallback ping
    await message.reply({
      content: `<@&${PING_ROLE_ID}>`
    }).catch(() => {});
  }
};
