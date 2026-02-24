import { EmbedBuilder, ChannelType } from "discord.js";
import TicketQueue from "../models/TicketQueue.js";

// ✅ PUT YOUR STAFF-ONLY TICKET QUEUE CHANNEL ID HERE
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

async function buildQueueEmbed(guild) {
  const tickets = guild.channels.cache
    .filter(ch => isTicketChannel(ch))
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
    .map(ch => {
      const ownerId = getTicketOwnerIdFromTopic(ch.topic);
      const created = `<t:${Math.floor(ch.createdTimestamp / 1000)}:R>`;
      return `• <#${ch.id}> — ${ownerId ? `<@${ownerId}>` : "Unknown"} — ${created}`;
    });

  const embed = new EmbedBuilder()
    .setColor(0x5865F2)
    .setTitle("🎫 Ticket Queue")
    .setDescription(
      tickets.length
        ? tickets.join("\n")
        : "✅ No open tickets right now."
    )
    .setFooter({ text: `Open tickets: ${tickets.length}` })
    .setTimestamp();

  return embed;
}

async function upsertQueueMessage(guild) {
  if (QUEUE_CHANNEL_ID === "PUT_TICKET_QUEUE_CHANNEL_ID_HERE") return;

  const queueChannel = guild.channels.cache.get(QUEUE_CHANNEL_ID);
  if (!queueChannel) return;

  const embed = await buildQueueEmbed(guild);

  // Load / create config row
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

  // Try edit existing message
  if (cfg.queueMessageId) {
    try {
      const msg = await queueChannel.messages.fetch(cfg.queueMessageId);
      await msg.edit({ embeds: [embed] });
      return;
    } catch {
      // message missing / can't fetch -> create new below
      cfg.queueMessageId = null;
      await cfg.save();
    }
  }

  // Create new queue message
  const sent = await queueChannel.send({ embeds: [embed] });
  cfg.queueMessageId = sent.id;
  await cfg.save();
}

export default {
  name: "ready",
  once: true,

  async execute(client) {
    console.log("📌 Ticket Queue system loaded.");

    // Initial build for all guilds
    for (const guild of client.guilds.cache.values()) {
      try {
        await guild.channels.fetch().catch(() => {});
        await upsertQueueMessage(guild);
      } catch {}
    }

    // Update on ticket channel create/delete
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
        await upsertQueueMessage(channel.guild);
      } catch {}
    });

    // Optional: refresh every 60s (covers edge cases)
    setInterval(async () => {
      for (const guild of client.guilds.cache.values()) {
        try {
          await upsertQueueMessage(guild);
        } catch {}
      }
    }, 60_000);
  }
};