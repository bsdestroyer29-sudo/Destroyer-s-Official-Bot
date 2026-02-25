import { PermissionsBitField } from "discord.js";

const NEWS_FEED_CHANNEL_ID = "1475507415205154847";
const PING_ROLE_ID = "1475500970518515753";

// Prevent spam pings if multiple posts happen fast
const COOLDOWN_MS = 15000;
let lastPingAt = 0;

export default {
  name: "messageCreate",
  once: false,

  async execute(message, client) {

    if (!message.guild) return;

    // Only in the news feed channel
    if (message.channel.id !== NEWS_FEED_CHANNEL_ID) return;

    // Ignore messages from THIS bot
    if (message.author?.id === client.user.id) return;

    // If role already mentioned, do nothing
    if (message.mentions.roles?.has(PING_ROLE_ID)) return;

    // Only allow:
    // - bot/webhook messages (news feed bots)
    // - OR human mods (ManageMessages)
    const isWebhook = !!message.webhookId;
    const isBotAuthor = message.author?.bot === true;

    if (!isBotAuthor && !isWebhook) {
      const member = message.member;
      if (!member) return;

      const isMod = member.permissions.has(PermissionsBitField.Flags.ManageMessages);
      if (!isMod) return; // normal users can't trigger auto ping
    }

    // Cooldown to avoid ping spam
    const now = Date.now();
    if (now - lastPingAt < COOLDOWN_MS) return;
    lastPingAt = now;

    // Send ping (clean + no extra text)
    await message.channel.send({
      content: `<@&${PING_ROLE_ID}>`,
      allowedMentions: { roles: [PING_ROLE_ID] }
    }).catch(() => {});
  }
};
