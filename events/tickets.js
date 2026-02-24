import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType
} from "discord.js";

// ============================
// SET THIS AFTER YOU GIVE ID
// ============================
const TRANSCRIPT_CHANNEL_ID = "1475543287912861860";

// ============================
// Helpers
// ============================
function staffRoleIds(guild) {
  // Roles considered "staff" by permissions
  return guild.roles.cache
    .filter(r =>
      r.id !== guild.id &&
      (r.permissions.has(PermissionFlagsBits.ManageMessages) ||
        r.permissions.has(PermissionFlagsBits.Administrator))
    )
    .map(r => r.id);
}

function findOpenTicketChannel(guild, userId) {
  return guild.channels.cache.find(
    ch =>
      ch.type === ChannelType.GuildText &&
      typeof ch.topic === "string" &&
      ch.topic.includes(`ticketOwner=${userId}`) &&
      ch.topic.includes("ticketSystem=destroyer")
  );
}

function parseOwnerIdFromTopic(topic) {
  const match = (topic || "").match(/ticketOwner=(\d+)/);
  return match ? match[1] : null;
}

async function fetchAllMessagesText(channel) {
  // Fetch messages in batches (Discord returns newest first)
  const all = [];
  let lastId = null;

  while (true) {
    const fetched = await channel.messages.fetch({
      limit: 100,
      before: lastId || undefined
    });

    if (!fetched.size) break;

    all.push(...fetched.values());
    lastId = fetched.last().id;

    // safety cap (avoid insane memory usage)
    if (all.length >= 5000) break;
  }

  // Oldest -> newest
  all.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

  const lines = [];

  for (const msg of all) {
    const time = new Date(msg.createdTimestamp).toISOString();
    const author = msg.author ? `${msg.author.tag}` : "Unknown";
    const content = (msg.content || "").trim();

    const attachments = msg.attachments?.map(a => a.url) || [];
    const embeds = msg.embeds?.length ? ` [embeds:${msg.embeds.length}]` : "";

    const header = `[${time}] ${author}${embeds}:`;

    if (content) {
      lines.push(`${header} ${content}`);
    } else {
      lines.push(`${header} (no text)`);
    }

    if (attachments.length) {
      for (const url of attachments) {
        lines.push(`  Attachment: ${url}`);
      }
    }
  }

  return lines.join("\n");
}

async function sendTranscript(guild, ticketChannel, closedByUserId) {
  if (TRANSCRIPT_CHANNEL_ID === "PUT_TRANSCRIPT_CHANNEL_ID_HERE") return;

  const transcriptChannel = guild.channels.cache.get(TRANSCRIPT_CHANNEL_ID);
  if (!transcriptChannel) return;

  const topic = ticketChannel.topic || "";
  const ownerId = parseOwnerIdFromTopic(topic);

  const transcriptText = await fetchAllMessagesText(ticketChannel);

  const header =
    `Ticket Transcript\n` +
    `Server: ${guild.name} (${guild.id})\n` +
    `Ticket Channel: #${ticketChannel.name} (${ticketChannel.id})\n` +
    `Ticket Owner: ${ownerId ? `<@${ownerId}> (${ownerId})` : "Unknown"}\n` +
    `Closed By: <@${closedByUserId}> (${closedByUserId})\n` +
    `Closed At: ${new Date().toISOString()}\n` +
    `----------------------------------------\n\n`;

  const fullText = header + (transcriptText || "(No messages found)");

  const fileBuffer = Buffer.from(fullText, "utf-8");

  const embed = new EmbedBuilder()
    .setColor(0x2f3136)
    .setTitle("📄 Ticket Transcript")
    .addFields(
      { name: "Ticket", value: `#${ticketChannel.name}` },
      { name: "Owner", value: ownerId ? `<@${ownerId}>` : "Unknown", inline: true },
      { name: "Closed By", value: `<@${closedByUserId}>`, inline: true }
    )
    .setTimestamp();

  await transcriptChannel.send({
    embeds: [embed],
    files: [{ attachment: fileBuffer, name: `transcript-${ticketChannel.id}.txt` }]
  });
}

// ============================
// Main Event
// ============================
export default {
  name: "interactionCreate",
  once: false,

  async execute(interaction, client) {

    // =========================
    // CREATE TICKET
    // =========================
    if (interaction.isButton() && interaction.customId.startsWith("ticket_create_")) {
      if (!interaction.inGuild()) return;

      await interaction.deferReply({ ephemeral: true });

      const guild = interaction.guild;
      const user = interaction.user;

      const existing = findOpenTicketChannel(guild, user.id);
      if (existing) {
        return interaction.editReply({
          content: `❌ You already have an open ticket: <#${existing.id}>`
        });
      }

      const staffIds = staffRoleIds(guild);

      const overwrites = [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
          id: user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.EmbedLinks
          ]
        },
        {
          id: client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ManageMessages
          ]
        },
        ...staffIds.map(rid => ({
          id: rid,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages
          ]
        }))
      ];

      const parent = interaction.channel?.parent ?? null;

      const safeName = user.username
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 10);

      const ticketChannel = await guild.channels.create({
        name: `ticket-${safeName || "user"}`,
        type: ChannelType.GuildText,
        parent: parent?.id ?? undefined,
        topic: `ticketSystem=destroyer;ticketOwner=${user.id}`,
        permissionOverwrites: overwrites,
        reason: `Ticket created by ${user.tag}`
      });

      const ticketEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle("🎫 Ticket Opened")
        .setDescription(
          `Hello <@${user.id}>!\n\n` +
          "Explain your issue here and staff will help you.\n" +
          "When you're done, press **Close Ticket**."
        )
        .setFooter({ text: "Destroyer | YT Bot • Ticket System" })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_close")
          .setLabel("Close Ticket")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("🔒")
      );

      await ticketChannel.send({
        content: `<@${user.id}>`,
        embeds: [ticketEmbed],
        components: [row]
      });

      await interaction.editReply({
        content: `✅ Ticket created: <#${ticketChannel.id}>`
      });

      return;
    }

    // =========================
    // CLOSE TICKET (ask confirm)
    // =========================
    if (interaction.isButton() && interaction.customId === "ticket_close") {
      if (!interaction.inGuild()) return;

      const channel = interaction.channel;
      if (!channel || channel.type !== ChannelType.GuildText) return;

      const topic = channel.topic || "";
      if (!topic.includes("ticketSystem=destroyer")) {
        return interaction.reply({ content: "❌ This isn't a ticket channel.", ephemeral: true });
      }

      const ownerId = parseOwnerIdFromTopic(topic);

      const isOwner = ownerId && interaction.user.id === ownerId;
      const isStaff =
        interaction.member.permissions.has(PermissionFlagsBits.ManageMessages) ||
        interaction.member.permissions.has(PermissionFlagsBits.Administrator);

      if (!isOwner && !isStaff) {
        return interaction.reply({
          content: "❌ Only the ticket owner or staff can close this.",
          ephemeral: true
        });
      }

      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_close_confirm")
          .setLabel("Confirm Close")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("ticket_close_cancel")
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({
        content: "Are you sure you want to close this ticket?",
        components: [confirmRow],
        ephemeral: true
      });
    }

    // =========================
    // CONFIRM / CANCEL
    // =========================
    if (
      interaction.isButton() &&
      (interaction.customId === "ticket_close_confirm" || interaction.customId === "ticket_close_cancel")
    ) {
      if (!interaction.inGuild()) return;

      if (interaction.customId === "ticket_close_cancel") {
        return interaction.update({ content: "✅ Close cancelled.", components: [] });
      }

      const channel = interaction.channel;
      if (!channel || channel.type !== ChannelType.GuildText) return;

      const topic = channel.topic || "";
      if (!topic.includes("ticketSystem=destroyer")) {
        return interaction.update({ content: "❌ This isn't a ticket channel.", components: [] });
      }

      await interaction.update({ content: "✅ Closing ticket & saving transcript...", components: [] });

      // Send transcript BEFORE deleting
      try {
        await sendTranscript(interaction.guild, channel, interaction.user.id);
      } catch (e) {
        // If transcript fails, still close ticket
        console.error("Transcript error:", e);
      }

      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle("🔒 Ticket Closed")
        .setDescription(`Closed by <@${interaction.user.id}>`)
        .setTimestamp();

      try {
        await channel.send({ embeds: [embed] });
      } catch {}

      setTimeout(async () => {
        try {
          await channel.delete(`Ticket closed by ${interaction.user.tag}`);
        } catch {}
      }, 2500);
    }
  }
};