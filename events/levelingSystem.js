import { EmbedBuilder } from "discord.js";
import Level from "../models/Level.js";

const LEVEL_10_ROLE_ID = "1461793005391446087";
const LEVEL_50_ROLE_ID = "1461793006200946749";
const LEVEL_100_ROLE_ID = "1461793007606169743";

// Optional (can use your log channel)
const LEVEL_LOG_CHANNEL_ID = "1475508584744747162";

// XP settings
const XP_MIN = 8;
const XP_MAX = 15;
const COOLDOWN_MS = 45_000; // 45s per user

const cooldown = new Map();

function xpToNext(level) {
  // Smooth curve (not too fast, not too slow)
  return 5 * (level ** 2) + 50 * level + 100;
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function applyLevelRoles(member, level) {
  const add = [];
  const remove = [];

  // Highest tier wins (optional: keep previous roles too—right now we keep all earned)
  if (LEVEL_10_ROLE_ID && level >= 10) add.push(LEVEL_10_ROLE_ID);
  if (LEVEL_50_ROLE_ID && level >= 50) add.push(LEVEL_50_ROLE_ID);
  if (LEVEL_100_ROLE_ID && level >= 100) add.push(LEVEL_100_ROLE_ID);

  if (add.length) {
    await member.roles.add(add).catch(() => {});
  }

  // If you want ONLY ONE tier role at a time, tell me and I’ll switch logic to remove lower roles.
}

export default {
  name: "messageCreate",
  once: false,

  async execute(message, client) {

    if (!message.guild) return;
    if (message.author.bot) return;

    // Optional: ignore very short messages (reduces farming)
    if (!message.content || message.content.trim().length < 3) return;

    const key = `${message.guild.id}:${message.author.id}`;
    const now = Date.now();

    if (cooldown.has(key) && now - cooldown.get(key) < COOLDOWN_MS) return;
    cooldown.set(key, now);

    const gained = randInt(XP_MIN, XP_MAX);

    // Upsert user
    const doc = await Level.findOneAndUpdate(
      { guildId: message.guild.id, userId: message.author.id },
      { $inc: { xp: gained } },
      { upsert: true, new: true }
    );

    let leveledUp = false;

    // Handle multiple level-ups if they gained enough XP
    while (doc.xp >= xpToNext(doc.level)) {
      doc.xp -= xpToNext(doc.level);
      doc.level += 1;
      leveledUp = true;
    }

    if (!leveledUp) {
      await doc.save();
      return;
    }

    await doc.save();

    // Assign roles at milestones
    const member = await message.guild.members.fetch(message.author.id).catch(() => null);
    if (member) {
      await applyLevelRoles(member, doc.level);
    }

    // Optional log
    const logChannel = client.channels.cache.get(LEVEL_LOG_CHANNEL_ID);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("⬆️ Level Up!")
        .setDescription(`${message.author.tag} reached **Level ${doc.level}**`)
        .setTimestamp();

      logChannel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
    }
  }
};
