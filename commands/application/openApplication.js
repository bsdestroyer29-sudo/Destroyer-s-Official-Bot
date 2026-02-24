import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  PermissionFlagsBits
} from "discord.js";

import ApplicationConfig from "../../models/ApplicationConfig.js";
import { updatePanel } from "../../events/applicationSystem.js";

export default {
  data: new ContextMenuCommandBuilder()
    .setName("Open Application")
    .setType(ApplicationCommandType.Message)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {

    await interaction.deferReply({ ephemeral: true });

    await ApplicationConfig.findOneAndUpdate(
      { guildId: interaction.guild.id },
      { isOpen: true }
    );

    await updatePanel(interaction.client, interaction.guild.id, true);

    return interaction.editReply("🟢 Applications are now OPEN.");
  }
};