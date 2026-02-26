import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} from "discord.js";

import ApplicationSession from "../../models/ApplicationSession.js";
import ApplicationConfig from "../../models/ApplicationConfig.js";

export default {
  data: new SlashCommandBuilder()
    .setName("appstats")
    .setDescription("View application statistics for this server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guild.id;

    // Get all configs for this guild
    const configs = await ApplicationConfig.find({ guildId });

    if (!configs.length) {
      return interaction.editReply("❌ No application panels found for this server.");
    }

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("📊 Application Statistics")
      .setTimestamp()
      .setFooter({ text: `${interaction.guild.name}` });

    let totalApplied = 0;
    let totalAccepted = 0;
    let totalDeclined = 0;
    let totalPending = 0;
    let totalInProgress = 0;

    for (const config of configs) {
      const panelMessageId = config.panelMessageId;

      const [applied, accepted, declined, pending, inProgress] = await Promise.all([
        // Total submitted
        ApplicationSession.countDocuments({ guildId, panelMessageId, submitted: true }),
        // Accepted
        ApplicationSession.countDocuments({ guildId, panelMessageId, submitted: true, reviewed: true, accepted: true }),
        // Declined
        ApplicationSession.countDocuments({ guildId, panelMessageId, submitted: true, reviewed: true, accepted: false }),
        // Pending review
        ApplicationSession.countDocuments({ guildId, panelMessageId, submitted: true, reviewed: false }),
        // In progress (started but not submitted)
        ApplicationSession.countDocuments({ guildId, panelMessageId, submitted: false, completed: false })
      ]);

      totalApplied += applied;
      totalAccepted += accepted;
      totalDeclined += declined;
      totalPending += pending;
      totalInProgress += inProgress;

      embed.addFields({
        name: `📋 ${config.title} — ${config.isOpen ? "🟢 OPEN" : "🔴 CLOSED"}`,
        value: [
          `📥 Submitted: **${applied}**`,
          `✅ Accepted: **${accepted}**`,
          `❌ Declined: **${declined}**`,
          `⏳ Pending Review: **${pending}**`,
          `✍️ In Progress: **${inProgress}**`
        ].join("\n"),
        inline: false
      });
    }

    // Show totals if more than one panel
    if (configs.length > 1) {
      embed.addFields({
        name: "📈 Overall Totals",
        value: [
          `📥 Submitted: **${totalApplied}**`,
          `✅ Accepted: **${totalAccepted}**`,
          `❌ Declined: **${totalDeclined}**`,
          `⏳ Pending Review: **${totalPending}**`,
          `✍️ In Progress: **${totalInProgress}**`
        ].join("\n"),
        inline: false
      });
    }

    return interaction.editReply({ embeds: [embed] });
  }
};
