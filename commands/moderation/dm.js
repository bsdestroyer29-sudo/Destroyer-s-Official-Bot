import {
  SlashCommandBuilder,
  PermissionFlagsBits
} from "discord.js";

import DMSession from "../../models/DMSession.js";

export default {
  data: new SlashCommandBuilder()
    .setName("dm")
    .setDescription("Send a DM to a user")
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
        `📩 **Message from ${interaction.guild.name} Staff**\n\n${message}\n\nReply to this message to respond.`
      );

      // Save session
      await DMSession.findOneAndUpdate(
        { userId: target.id },
        {
          guildId: interaction.guild.id,
          userId: target.id,
          staffId: interaction.user.id
        },
        { upsert: true }
      );

      await interaction.editReply(`✅ DM sent to ${target.tag}`);
    } catch {
      await interaction.editReply(
        `❌ Could not DM ${target.tag}. They may have DMs disabled.`
      );
    }
  }
};