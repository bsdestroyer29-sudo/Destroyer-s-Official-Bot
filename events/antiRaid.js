import { EmbedBuilder } from "discord.js";

const LOG_CHANNEL_ID = "1475508584744747162";

/* =============================
   CONFIG
============================= */

const MASS_JOIN_THRESHOLD = 7;       // 7 joins
const MASS_JOIN_WINDOW = 10000;      // 10 seconds

const NEW_ACCOUNT_DAYS = 3;          // younger than 3 days = suspicious

const MASS_MESSAGE_THRESHOLD = 6;    // 6 msgs
const MASS_MESSAGE_WINDOW = 5000;    // 5 seconds

const LOCKDOWN_DURATION = 5 * 60 * 1000; // 5 minutes

/* =============================
   RUNTIME STORAGE
============================= */

let joinBuffer = [];
let messageBuffer = new Map();
let raidMode = false;

/* =============================
   LOCKDOWN FUNCTION
============================= */

async function enableLockdown(guild, client) {

  if (raidMode) return;
  raidMode = true;

  // Lock all text channels
  guild.channels.cache
    .filter(c => c.isTextBased())
    .forEach(channel => {
      channel.permissionOverwrites.edit(
        guild.roles.everyone,
        { SendMessages: false }
      ).catch(() => {});
    });

  const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);

  if (logChannel) {
    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle("🚨 RAID DETECTED – LOCKDOWN ENABLED")
      .setDescription("Server automatically locked for protection.")
      .setTimestamp();

    logChannel.send({ embeds: [embed] });
  }

  // Auto unlock after duration
  setTimeout(async () => {
    guild.channels.cache
      .filter(c => c.isTextBased())
      .forEach(channel => {
        channel.permissionOverwrites.edit(
          guild.roles.everyone,
          { SendMessages: null }
        ).catch(() => {});
      });

    raidMode = false;

    if (logChannel) {
      logChannel.send("🟢 Lockdown automatically lifted.");
    }

  }, LOCKDOWN_DURATION);
}

/* =============================
   EVENT EXPORT
============================= */

export default {
  name: "ready",
  once: false,

  execute(client) {

    /* =============================
       MASS JOIN DETECTION
    ============================== */

    client.on("guildMemberAdd", async member => {

      const now = Date.now();
      joinBuffer.push(now);

      joinBuffer = joinBuffer.filter(
        t => now - t < MASS_JOIN_WINDOW
      );

      // Suspicious new account
      const accountAge =
        (Date.now() - member.user.createdTimestamp) / 86400000;

      if (accountAge < NEW_ACCOUNT_DAYS) {
        await member.timeout(60 * 60 * 1000).catch(() => {});
      }

      // Mass join detected
      if (joinBuffer.length >= MASS_JOIN_THRESHOLD) {
        await enableLockdown(member.guild, client);
        joinBuffer = [];
      }
    });

    /* =============================
       MASS MESSAGE SPAM
    ============================== */

    client.on("messageCreate", async message => {

      if (!message.guild) return;
      if (message.author.bot) return;

      const userId = message.author.id;
      const now = Date.now();

      if (!messageBuffer.has(userId)) {
        messageBuffer.set(userId, []);
      }

      const timestamps = messageBuffer.get(userId);
      timestamps.push(now);

      const filtered = timestamps.filter(
        t => now - t < MASS_MESSAGE_WINDOW
      );

      messageBuffer.set(userId, filtered);

      if (filtered.length >= MASS_MESSAGE_THRESHOLD) {

        const member = message.member;
        if (!member) return;

        await member.timeout(10 * 60 * 1000).catch(() => {});
      }
    });

  }
};