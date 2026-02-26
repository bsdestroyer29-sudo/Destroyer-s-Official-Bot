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

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guild.id;

    const configs = await ApplicationConfig.find({ guildId });

    if (!configs.length) {
      return interaction.editReply("❌ No application panels found for this server.");
    }

    // ✅ Filter only configs whose panel message actually exists in Discord
    const validConfigs = [];
    for (const config of configs) {
      try {
        const channel = await client.channels.fetch(config.panelChannelId).catch(() => null);
        if (!channel) continue;

        const message = await channel.messages.fetch(config.panelMessageId).catch(() => null);
        if (!message) continue;

        validConfigs.push({ config, channel });
      } catch {
        continue;
      }
    }

    if (!validConfigs.length) {
      return interaction.editReply("❌ No active application panels found. Old panels may have been deleted.");
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

    for (const { config, channel } of validConfigs) {
      const panelMessageId = config.panelMessageId;

      const [applied, accepted, declined, pending, inProgress] = await Promise.all([
        ApplicationSession.countDocuments({ guildId, panelMessageId, submitted: true }),
        ApplicationSession.countDocuments({ guildId, panelMessageId, submitted: true, reviewed: true, accepted: true }),
        ApplicationSession.countDocuments({ guildId, panelMessageId, submitted: true, reviewed: true, accepted: false }),
        ApplicationSession.countDocuments({ guildId, panelMessageId, submitted: true, reviewed: false }),
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
          `📍 Channel: ${channel}`,
          `📥 Submitted: **${applied}**`,
          `✅ Accepted: **${accepted}**`,
          `❌ Declined: **${declined}**`,
          `⏳ Pending Review: **${pending}**`,
          `✍️ In Progress: **${inProgress}**`
        ].join("\n"),
        inline: false
      });
    }

    if (validConfigs.length > 1) {
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
