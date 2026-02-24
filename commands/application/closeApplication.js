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

    await ApplicationConfig.findOneAndUpdate(
      { guildId: interaction.guild.id },
      { isOpen: false }
    );

    return interaction.reply({
      content: "🔒 Applications are now CLOSED.",
      ephemeral: true
    });
  }
};