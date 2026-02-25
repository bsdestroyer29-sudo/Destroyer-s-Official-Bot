import { PermissionsBitField } from "discord.js";

const LOG_CHANNEL_ID = "1475508584744747162";

const userWarnings = new Map();
const messageTracker = new Map();

function addWarning(member) {
  const current = userWarnings.get(member.id) || 0;
  const newCount = current + 1;
  userWarnings.set(member.id, newCount);
  return newCount;
}

export default {
  name: "messageCreate",
  once: false,

  async execute(message, client) {

    if (!message.guild) return;
    if (message.author.bot) return;

    const member = message.member;

    // Staff immune
    if (member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return;

    const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);

    /* ===============================
       SPAM DETECTION
    =============================== */

    const now = Date.now();
    const userData = messageTracker.get(member.id) || [];
    userData.push(now);

    const recent = userData.filter(t => now - t < 4000);
    messageTracker.set(member.id, recent);

    if (recent.length >= 5) {
      await message.delete().catch(() => {});
      const warns = addWarning(member);

      if (logChannel) {
        logChannel.send(`🚫 Spam detected from ${member.user.tag} | Warns: ${warns}`);
      }

      await handlePunishment(member, warns);
      return;
    }

    /* ===============================
       MESSAGE REPEAT
    =============================== */

    if (!member.lastMessageContent) member.lastMessageContent = "";

    if (message.content === member.lastMessageContent) {
      member.repeatCount = (member.repeatCount || 0) + 1;
    } else {
      member.repeatCount = 0;
    }

    member.lastMessageContent = message.content;

    if (member.repeatCount >= 2) {
      await message.delete().catch(() => {});
      const warns = addWarning(member);

      if (logChannel) {
        logChannel.send(`🔁 Message repetition from ${member.user.tag} | Warns: ${warns}`);
      }

      await handlePunishment(member, warns);
      return;
    }

    /* ===============================
       CAPS DETECTION
    =============================== */

    const letters = message.content.replace(/[^a-zA-Z]/g, "");
    if (letters.length >= 10) {
      const upper = letters.replace(/[^A-Z]/g, "").length;
      if (upper / letters.length >= 0.7) {
        await message.delete().catch(() => {});
        const warns = addWarning(member);

        if (logChannel) {
          logChannel.send(`🔊 Caps spam from ${member.user.tag} | Warns: ${warns}`);
        }

        await handlePunishment(member, warns);
        return;
      }
    }

    /* ===============================
       EMOJI SPAM
    =============================== */

    const emojiCount = (message.content.match(/<a?:\w+:\d+>|[\u{1F300}-\u{1FAFF}]/gu) || []).length;

    if (emojiCount >= 12) {
      await message.delete().catch(() => {});
      const warns = addWarning(member);

      if (logChannel) {
        logChannel.send(`😂 Emoji spam from ${member.user.tag} | Warns: ${warns}`);
      }

      await handlePunishment(member, warns);
      return;
    }

    /* ===============================
       INVITE LINK DETECTION
    =============================== */

    if (message.content.includes("discord.gg/") || message.content.includes("discord.com/invite/")) {
      await message.delete().catch(() => {});
      const warns = addWarning(member);

      if (logChannel) {
        logChannel.send(`🔗 Invite link from ${member.user.tag} | Warns: ${warns}`);
      }

      await handlePunishment(member, warns);
      return;
    }
  }
};

async function handlePunishment(member, warns) {

  if (warns === 3) {
    await member.timeout(10 * 60 * 1000).catch(() => {});
  }

  if (warns === 5) {
    await member.kick().catch(() => {});
  }

  if (warns >= 7) {
    await member.ban().catch(() => {});
  }
}