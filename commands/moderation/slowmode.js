import {
  SlashCommandBuilder,
  PermissionFlagsBits
} from "discord.js";

const LOG_CHANNEL_ID = "1475508584744747162";

export default {
  data: new SlashCommandBuilder()
    .setName("slowmode")
    .setDescription("Set slowmode in this channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption(o =>
      o.setName("seconds").setDescription("Seconds (0 to disable)").setRequired(true)
    ),

  async execute(interaction) {

    const seconds = interaction.options.getInteger("seconds");

    await interaction.channel.setRateLimitPerUser(seconds);

    const logChannel = interaction.client.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) {
      logChannel.send(`🐢 ${interaction.user.tag} set slowmode to ${seconds}s in <#${interaction.channel.id}>`);
    }

    return interaction.reply({
      content: `🐢 Slowmode set to ${seconds} seconds.`,
      ephemeral: true
    });
  }
};