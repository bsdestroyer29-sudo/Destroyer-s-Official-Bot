import {
  SlashCommandBuilder,
  PermissionFlagsBits
} from "discord.js";

const LOG_CHANNEL_ID = "1475508584744747162";

export default {
  data: new SlashCommandBuilder()
    .setName("unslowmode")
    .setDescription("Disable slowmode in this channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {

    if (interaction.channel.rateLimitPerUser === 0) {
      return interaction.reply({
        content: "🐢 Slowmode is already disabled.",
        ephemeral: true
      });
    }

    await interaction.channel.setRateLimitPerUser(0);

    const logChannel = interaction.client.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) {
      logChannel.send(
        `🐢❌ ${interaction.user.tag} disabled slowmode in <#${interaction.channel.id}>`
      );
    }

    return interaction.reply({
      content: "🐢❌ Slowmode disabled.",
      ephemeral: true
    });
  }
};