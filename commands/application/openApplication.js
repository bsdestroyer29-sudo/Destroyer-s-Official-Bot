import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  PermissionFlagsBits
} from "discord.js";

import ApplicationConfig from "../../models/ApplicationConfig.js";

export default {
  data: new ContextMenuCommandBuilder()
    .setName("Open Application")
    .setType(ApplicationCommandType.Message)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {

    try {
      await interaction.deferReply({ ephemeral: true });

      await ApplicationConfig.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { isOpen: true }
      );

      return interaction.editReply({
        content: "🟢 Applications are now OPEN."
      });

    } catch (err) {
      console.error(err);
      return interaction.editReply({
        content: "❌ Error opening applications."
      });
    }
  }
};