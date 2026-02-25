import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} from "discord.js";

import Warning from "../../models/Warning.js";

const LOG_CHANNEL_ID = "1475508584744747162";

export default {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a member")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("User to warn")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("Reason for warning")
        .setRequired(true)
    ),

  async execute(interaction) {

    const member = interaction.options.getMember("user");
    const reason = interaction.options.getString("reason");

    if (!member)
      return interaction.reply({ content: "User not found.", ephemeral: true });

    if (member.permissions.has(PermissionFlagsBits.Administrator))
      return interaction.reply({
        content: "You cannot warn this user.",
        ephemeral: true
      });

    // Save warning
    await Warning.create({
      guildId: interaction.guild.id,
      userId: member.id,
      moderatorId: interaction.user.id,
      reason
    });

    const totalWarns = await Warning.countDocuments({
      guildId: interaction.guild.id,
      userId: member.id
    });

    // DM user
    await member.send(
      `⚠ You have been warned in **${interaction.guild.name}**.\nReason: ${reason}\nTotal Warnings: ${totalWarns}`
    ).catch(() => {});

    // Escalation
    if (totalWarns === 3) {
      await member.timeout(10 * 60 * 1000).catch(() => {});
    }

    if (totalWarns === 5) {
      await member.kick().catch(() => {});
    }

    if (totalWarns >= 7) {
      await member.ban().catch(() => {});
    }

    // Log
    const logChannel = interaction.client.channels.cache.get(LOG_CHANNEL_ID);

    if (logChannel) {
      const embed = new EmbedBuilder()
        .setColor("Orange")
        .setTitle("⚠ Member Warned")
        .addFields(
          { name: "User", value: `<@${member.id}>` },
          { name: "Moderator", value: `<@${interaction.user.id}>` },
          { name: "Reason", value: reason },
          { name: "Total Warnings", value: `${totalWarns}` }
        )
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    }

    return interaction.reply({
      content: `⚠ <@${member.id}> warned. Total warnings: ${totalWarns}`,
      ephemeral: true
    });
  }
};