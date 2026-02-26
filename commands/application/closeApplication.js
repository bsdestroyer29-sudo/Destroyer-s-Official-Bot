import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
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

      const targetMessage = interaction.targetMessage;
      if (!targetMessage)
        return interaction.editReply("❌ Target message not found.");

      const config = await ApplicationConfig.findOne({
        panelMessageId: targetMessage.id
      });

      if (!config)
        return interaction.editReply("❌ Panel config not found.");

      config.isOpen = false;
      await config.save();

      const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle(`🔒 CLOSED — ${config.title}`)
        .setDescription(config.description);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("application_closed")
          .setLabel("Closed")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

      await targetMessage.edit({
        embeds: [embed],
        components: [row]
      });

      return interaction.editReply("🔒 Applications are now CLOSED.");

    } catch (error) {

      console.error("Close Application Error:", error);

      if (!interaction.replied)
        await interaction.reply({
          content: "❌ Something went wrong.",
          ephemeral: true
        });
    }
  }
};