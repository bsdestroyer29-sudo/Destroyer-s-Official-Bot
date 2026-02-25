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

    await interaction.deferReply({ ephemeral: true });

    const targetMessage = interaction.targetMessage;

    if (!targetMessage) {
      return interaction.editReply("❌ Could not find target message.");
    }

    const config = await ApplicationConfig.findOne({
      panelMessageId: targetMessage.id
    });

    if (!config) {
      return interaction.editReply("❌ This message is not an application panel.");
    }

    config.isOpen = false;
    await config.save();

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle(config.title)
      .setDescription(config.description)
      .setFooter({ text: "Status: CLOSED" });

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
  }
};