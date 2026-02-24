import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType
} from "discord.js";

function staffRoleIds(guild) {
  // Allow roles that have Manage Messages OR Administrator
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

export default {
  name: "interactionCreate",
  once: false,

  async execute(interaction, client) {
    // =========================
    // CREATE TICKET (panel button)
    // =========================
    if (interaction.isButton() && interaction.customId.startsWith("ticket_create_")) {
      if (!interaction.inGuild()) return;

      // Acknowledge fast
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
        {
          id: guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
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

      // Put tickets in same category as the panel channel (if it has one)
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
    // CLOSE TICKET (inside ticket)
    // =========================
    if (interaction.isButton() && interaction.customId === "ticket_close") {
      if (!interaction.inGuild()) return;

      const channel = interaction.channel;
      if (!channel || channel.type !== ChannelType.GuildText) return;

      const topic = channel.topic || "";
      if (!topic.includes("ticketSystem=destroyer")) {
        return interaction.reply({ content: "❌ This isn't a ticket channel.", ephemeral: true });
      }

      // Get owner from topic
      const match = topic.match(/ticketOwner=(\d+)/);
      const ownerId = match ? match[1] : null;

      const isOwner = ownerId && interaction.user.id === ownerId;
      const isStaff = interaction.member.permissions.has(PermissionFlagsBits.ManageMessages) ||
                      interaction.member.permissions.has(PermissionFlagsBits.Administrator);

      if (!isOwner && !isStaff) {
        return interaction.reply({ content: "❌ Only the ticket owner or staff can close this.", ephemeral: true });
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
    if (interaction.isButton() && (interaction.customId === "ticket_close_confirm" || interaction.customId === "ticket_close_cancel")) {
      if (!interaction.inGuild()) return;

      if (interaction.customId === "ticket_close_cancel") {
        return interaction.update({ content: "✅ Close cancelled.", components: [] });
      }

      const channel = interaction.channel;
      if (!channel || channel.type !== ChannelType.GuildText) return;

      const embed = new EmbedBuilder()
        .setColor(0xED4245)
        .setTitle("🔒 Ticket Closed")
        .setDescription(`Closed by <@${interaction.user.id}>`)
        .setTimestamp();

      await interaction.update({ content: "✅ Closing ticket...", components: [] });
      await channel.send({ embeds: [embed] });

      // Delete shortly after (fast + clean)
      setTimeout(async () => {
        try {
          await channel.delete(`Ticket closed by ${interaction.user.tag}`);
        } catch {}
      }, 3000);
    }
  }
};