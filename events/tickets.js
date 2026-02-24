import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType
} from "discord.js";

import TicketClaim from "../models/TicketClaim.js";
import { upsertQueueMessage } from "./ticketQueue.js";

function staffRoleIds(guild) {
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

function isTicketChannel(channel) {
  return (
    channel &&
    channel.type === ChannelType.GuildText &&
    typeof channel.topic === "string" &&
    channel.topic.includes("ticketSystem=destroyer") &&
    channel.topic.includes("ticketOwner=")
  );
}

function isStaffMember(member) {
  return (
    member.permissions.has(PermissionFlagsBits.ManageMessages) ||
    member.permissions.has(PermissionFlagsBits.Administrator)
  );
}

function getStaffLabelRoleId(member) {
  // Show the member's highest role name (excluding @everyone)
  const topRole = member.roles.cache
    .filter(r => r.id !== member.guild.id)
    .sort((a, b) => b.position - a.position)
    .first();

  return topRole?.id || null;
}

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
          "Staff can **Claim** this ticket when they start helping.\n" +
          "When you're done, press **Close Ticket**."
        )
        .setFooter({ text: "Destroyer | YT Bot • Ticket System" })
        .setTimestamp();

      const controls = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_claim")
          .setLabel("Claim")
          .setStyle(ButtonStyle.Success)
          .setEmoji("✅"),
        new ButtonBuilder()
          .setCustomId("ticket_close")
          .setLabel("Close Ticket")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("🔒")
      );

      await ticketChannel.send({
        content: `<@${user.id}>`,
        embeds: [ticketEmbed],
        components: [controls]
      });

      await interaction.editReply({
        content: `✅ Ticket created: <#${ticketChannel.id}>`
      });

      // refresh queue
      try { await upsertQueueMessage(guild); } catch {}

      return;
    }

    // =========================
    // CLAIM / UNCLAIM
    // =========================
    if (interaction.isButton() && (interaction.customId === "ticket_claim" || interaction.customId === "ticket_unclaim")) {
      if (!interaction.inGuild()) return;

      const channel = interaction.channel;
      if (!isTicketChannel(channel)) {
        return interaction.reply({ content: "❌ This isn't a ticket channel.", ephemeral: true });
      }

      if (!isStaffMember(interaction.member)) {
        return interaction.reply({ content: "❌ Staff only.", ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      const existing = await TicketClaim.findOne({ ticketChannelId: channel.id });

      // UNCLAIM
      if (interaction.customId === "ticket_unclaim") {
        if (!existing?.claimedById) {
          return interaction.editReply({ content: "❌ This ticket is not claimed." });
        }

        const isClaimer = existing.claimedById === interaction.user.id;
        const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);

        if (!isClaimer && !isAdmin) {
          return interaction.editReply({ content: "❌ Only the claimer or an admin can unclaim." });
        }

        existing.claimedById = null;
        existing.claimedRoleId = null;
        existing.claimedAt = null;
        await existing.save();

        // Update buttons on the main ticket message (best effort)
        try {
          const msg = interaction.message;
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("ticket_claim")
              .setLabel("Claim")
              .setStyle(ButtonStyle.Success)
              .setEmoji("✅"),
            new ButtonBuilder()
              .setCustomId("ticket_close")
              .setLabel("Close Ticket")
              .setStyle(ButtonStyle.Danger)
              .setEmoji("🔒")
          );
          await msg.edit({ components: [row] });
        } catch {}

        try { await upsertQueueMessage(interaction.guild); } catch {}

        return interaction.editReply({ content: "✅ Ticket unclaimed." });
      }

      // CLAIM
      if (existing?.claimedById) {
        return interaction.editReply({
          content: `❌ Already claimed by <@${existing.claimedById}>.`
        });
      }

      const roleId = getStaffLabelRoleId(interaction.member);

      await TicketClaim.updateOne(
        { ticketChannelId: channel.id },
        {
          $set: {
            guildId: interaction.guild.id,
            ticketChannelId: channel.id,
            claimedById: interaction.user.id,
            claimedRoleId: roleId,
            claimedAt: new Date()
          }
        },
        { upsert: true }
      );

      // Change button to Unclaim (best effort)
      try {
        const msg = interaction.message;
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("ticket_unclaim")
            .setLabel("Unclaim")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("↩️"),
          new ButtonBuilder()
            .setCustomId("ticket_close")
            .setLabel("Close Ticket")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("🔒")
        );
        await msg.edit({ components: [row] });
      } catch {}

      try { await upsertQueueMessage(interaction.guild); } catch {}

      return interaction.editReply({ content: "✅ Ticket claimed." });
    }

    // =========================
    // CLOSE TICKET (ask confirm)
    // =========================
    if (interaction.isButton() && interaction.customId === "ticket_close") {
      if (!interaction.inGuild()) return;

      const channel = interaction.channel;
      if (!isTicketChannel(channel)) {
        return interaction.reply({ content: "❌ This isn't a ticket channel.", ephemeral: true });
      }

      const ownerId = parseOwnerIdFromTopic(channel.topic);

      const isOwner = ownerId && interaction.user.id === ownerId;
      const isStaff = isStaffMember(interaction.member);

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
      if (!isTicketChannel(channel)) {
        return interaction.update({ content: "❌ This isn't a ticket channel.", components: [] });
      }

      await interaction.update({ content: "✅ Closing ticket...", components: [] });

      // Clean claim record
      try {
        await TicketClaim.deleteOne({ ticketChannelId: channel.id });
      } catch {}

      // Refresh queue before delete
      try { await upsertQueueMessage(interaction.guild); } catch {}

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