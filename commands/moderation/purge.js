import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} from "discord.js";

const LOG_CHANNEL_ID = "1475508584744747162";

export default {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Delete multiple messages")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(option =>
      option
        .setName("amount")
        .setDescription("Amount of messages (1-100)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),

  async execute(interaction) {

    const amount = interaction.options.getInteger("amount");

    await interaction.channel.bulkDelete(amount, true);

    await interaction.reply({
      content: `🧹 Deleted ${amount} messages.`,
      ephemeral: true
    });

    const logChannel = interaction.client.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) {
      logChannel.send(
        `🧹 ${interaction.user.tag} purged ${amount} messages in <#${interaction.channel.id}>`
      );
    }
  }
};