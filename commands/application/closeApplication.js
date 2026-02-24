import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  PermissionFlagsBits
} from "discord.js";

import ApplicationConfig from "../../models/ApplicationConfig.js";

export default {
  data: new ContextMenuCommandBuilder()
    .setName("Close Application")
    .setType(ApplicationCommandType.Message)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {

    try {
      await interaction.deferReply({ ephemeral: true });

      await ApplicationConfig.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { isOpen: false }
      );

      return interaction.editReply({
        content: "🔒 Applications are now CLOSED."
      });

    } catch (err) {
      console.error(err);
      return interaction.editReply({
        content: "❌ Error closing applications."
      });
    }
  }
};