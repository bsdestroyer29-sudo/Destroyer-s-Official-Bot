import {
  SlashCommandBuilder,
  PermissionFlagsBits
} from "discord.js";

import DMSession from "../../models/DMSession.js";

// 🔥 PUT YOUR DM LOG CHANNEL ID HERE
const DM_LOG_CHANNEL_ID = "PUT_DM_LOG_CHANNEL_ID";

export default {
  data: new SlashCommandBuilder()
    .setName("dm")
    .setDescription("Start or continue DM conversation")
    .addUserOption(option =>
      option.setName("user").setDescription("User").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("message").setDescription("Message").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {

    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser("user");
    const message = interaction.options.getString("message");

    if (target.bot) {
      return interaction.editReply("❌ You cannot DM bots.");
    }

    try {
      await target.send(
        `📩 **Message from ${interaction.guild.name} Staff**\n\n${message}`
      );

      await DMSession.findOneAndUpdate(
        { userId: target.id },
        {
          guildId: interaction.guild.id,
          userId: target.id,
          staffId: interaction.user.id,
          logChannelId: DM_LOG_CHANNEL_ID,
          active: true
        },
        { upsert: true }
      );

      const logChannel = interaction.guild.channels.cache.get(DM_LOG_CHANNEL_ID);
      if (logChannel) {
        logChannel.send(
          `📤 **Staff → ${target.tag}**\n${message}`
        );
      }

      await interaction.editReply(`✅ DM sent to ${target.tag}`);

    } catch {
      await interaction.editReply(
        `❌ Could not DM ${target.tag}.`
      );
    }
  }
};