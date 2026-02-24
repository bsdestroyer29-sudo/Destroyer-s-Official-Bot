import { EmbedBuilder, ChannelType, PermissionFlagsBits } from "discord.js";
import TicketQueue from "../models/TicketQueue.js";
import TicketClaim from "../models/TicketClaim.js";

// ✅ YOUR STAFF-ONLY QUEUE CHANNEL
const QUEUE_CHANNEL_ID = "1461790037820833884";

function isTicketChannel(channel) {
  return (
    channel &&
    channel.type === ChannelType.GuildText &&
    typeof channel.topic === "string" &&
    channel.topic.includes("ticketSystem=destroyer") &&
    channel.topic.includes("ticketOwner=")
  );
}

function getTicketOwnerIdFromTopic(topic) {
  const match = (topic || "").match(/ticketOwner=(\d+)/);
  return match ? match[1] : null;
}

function formatClaim(guild, claim) {
  if (!claim?.claimedById) return null;

  const roleName = claim.claimedRoleId
    ? (guild.roles.cache.get(claim.claimedRoleId)?.name || "Staff")
    : "Staff";

  return `claimed by <@${claim.claimedById}> (${roleName})`;
}

async function buildQueueEmbed(guild) {
  const ticketChannels = guild.channels.cache
    .filter(ch => isTicketChannel(ch))
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  const ticketIds = ticketChannels.map(ch => ch.id);

  const claims = await TicketClaim.find({
    guildId: guild.id,
    ticketChannelId: { $in: ticketIds }
  }).lean();

  const claimMap = new Map(claims.map(c => [c.ticketChannelId, c]));

  const lines = ticketChannels.map(ch => {
    const ownerId = getTicketOwnerIdFromTopic(ch.topic);
    const created = `<t:${Math.floor(ch.createdTimestamp / 1000)}:R>`;

    const claim = claimMap.get(ch.id);
    const claimText = formatClaim(guild, claim);

    return `• <#${ch.id}> — ${ownerId ? `<@${ownerId}>` : "Unknown"} — ${created}${claimText ? ` — **${claimText}**` : ""}`;
  });

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("🎫 Ticket Queue")
    .setDescription(lines.length ? lines.join("\n") : "✅ No open tickets right now.")
    .setFooter({ text: `Open tickets: ${lines.length}` })
    .setTimestamp();

  return embed;
}

export async function upsertQueueMessage(guild) {
  const queueChannel = guild.channels.cache.get(QUEUE_CHANNEL_ID);
  if (!queueChannel) return;

  // Ensure channel fetch for safety
  try { await guild.channels.fetch(); } catch {}

  const embed = await buildQueueEmbed(guild);

  let cfg = await TicketQueue.findOne({ guildId: guild.id });

  if (!cfg) {
    cfg = await TicketQueue.create({
      guildId: guild.id,
      queueChannelId: QUEUE_CHANNEL_ID,
      queueMessageId: null
    });
  } else if (cfg.queueChannelId !== QUEUE_CHANNEL_ID) {
    cfg.queueChannelId = QUEUE_CHANNEL_ID;
    await cfg.save();
  }

  if (cfg.queueMessageId) {
    try {
      const msg = await queueChannel.messages.fetch(cfg.queueMessageId);
      await msg.edit({ embeds: [embed] });
      return;
    } catch {
      cfg.queueMessageId = null;
      await cfg.save();
    }
  }

  const sent = await queueChannel.send({ embeds: [embed] });
  cfg.queueMessageId = sent.id;
  await cfg.save();
}

export default {
  name: "ready",
  once: true,

  async execute(client) {
    console.log("📌 Ticket Queue system loaded.");

    for (const guild of client.guilds.cache.values()) {
      try {
        await upsertQueueMessage(guild);
      } catch {}
    }

    client.on("channelCreate", async channel => {
      try {
        if (!channel.guild) return;
        if (!isTicketChannel(channel)) return;
        await upsertQueueMessage(channel.guild);
      } catch {}
    });

    client.on("channelDelete", async channel => {
      try {
        if (!channel.guild) return;
        if (!isTicketChannel(channel)) return;

        // Clean claim record if channel deleted
        try {
          await TicketClaim.deleteOne({ ticketChannelId: channel.id });
        } catch {}

        await upsertQueueMessage(channel.guild);
      } catch {}
    });

    setInterval(async () => {
      for (const guild of client.guilds.cache.values()) {
        try {
          await upsertQueueMessage(guild);
        } catch {}
      }
    }, 60_000);
  }
};