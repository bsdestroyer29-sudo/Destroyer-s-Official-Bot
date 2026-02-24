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

    await ApplicationConfig.findOneAndUpdate(
      { guildId: interaction.guild.id },
      { isOpen: true }
    );

    return interaction.reply({
      content: "🟢 Applications are now OPEN.",
      ephemeral: true
    });
  }
};