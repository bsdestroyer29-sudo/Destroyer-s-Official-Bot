import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("resetchannel")
    .setDescription("Instantly wipes this channel completely")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({
        content: "❌ You need Manage Channels permission.",
        ephemeral: true
      });
    }

    const channel = interaction.channel;

    if (channel.type !== ChannelType.GuildText) {
      return interaction.reply({
        content: "❌ Only works in text channels.",
        ephemeral: true
      });
    }

    await interaction.reply({
      content: "⚡ Resetting channel...",
      ephemeral: true
    });

    try {
      const newChannel = await channel.clone({
        name: channel.name,
        topic: channel.topic,
        rateLimitPerUser: channel.rateLimitPerUser,
        nsfw: channel.nsfw,
        parent: channel.parent,
        permissionOverwrites: channel.permissionOverwrites.cache
      });

      await newChannel.setPosition(channel.position);

      await channel.delete("Channel reset by bot");

      await newChannel.send("🧹 Channel has been reset.");

    } catch (error) {
      console.error(error);
    }
  }
};