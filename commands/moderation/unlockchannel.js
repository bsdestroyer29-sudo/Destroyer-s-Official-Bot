import {
  SlashCommandBuilder,
  PermissionFlagsBits
} from "discord.js";

const LOG_CHANNEL_ID = "1475508584744747162";

export default {
  data: new SlashCommandBuilder()
    .setName("unlockchannel")
    .setDescription("Unlock this channel")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {

    await interaction.channel.permissionOverwrites.edit(
      interaction.guild.roles.everyone,
      { SendMessages: null }
    );

    const logChannel = interaction.client.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) {
      logChannel.send(`🔓 ${interaction.user.tag} unlocked <#${interaction.channel.id}>`);
    }

    return interaction.reply({ content: "🔓 Channel unlocked.", ephemeral: true });
  }
};