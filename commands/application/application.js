import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} from "discord.js";

import ApplicationConfig from "../../models/ApplicationConfig.js";

export default {
  data: new SlashCommandBuilder()
    .setName("application")
    .setDescription("Application system")

    .addSubcommand(sub =>
      sub
        .setName("setup")
        .setDescription("Setup application panel")
        .addStringOption(o =>
          o.setName("title").setDescription("Panel title").setRequired(true)
        )
        .addStringOption(o =>
          o.setName("description").setDescription("Panel description").setRequired(true)
        )
        .addChannelOption(o =>
          o.setName("channel").setDescription("Channel to send panel").setRequired(true)
        )
        .addStringOption(o =>
          o.setName("questions")
            .setDescription("Questions separated by | (max 10)")
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub.setName("close")
        .setDescription("Close an application panel (reply to panel)")
    )

    .addSubcommand(sub =>
      sub.setName("open")
        .setDescription("Open an application panel (reply to panel)")
    )

    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {

    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();

    // ========================
    // SETUP
    // ========================

    if (sub === "setup") {

      const title = interaction.options.getString("title");
      const description = interaction.options.getString("description");
      const channel = interaction.options.getChannel("channel");
      const questionsRaw = interaction.options.getString("questions");

      const questions = questionsRaw.split("|").map(q => q.trim());

      if (questions.length < 1 || questions.length > 10)
        return interaction.editReply("Questions must be between 1 and 10.");

      const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: "Status: OPEN" });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("application_entry")
          .setLabel("Entry")
          .setStyle(ButtonStyle.Primary)
      );

      const panelMessage = await channel.send({
        embeds: [embed],
        components: [row]
      });

      await ApplicationConfig.create({
        guildId: interaction.guild.id,
        panelChannelId: channel.id,
        panelMessageId: panelMessage.id,
        title,
        description,
        questions,
        isOpen: true
      });

      return interaction.editReply("Application panel created.");
    }

    // ========================
    // CLOSE / OPEN
    // ========================

    const replied = interaction.channel.messages.cache
      .get(interaction.targetId || interaction.message?.reference?.messageId);

    if (!replied)
      return interaction.editReply("Reply to the application panel message.");

    const config = await ApplicationConfig.findOne({
      panelMessageId: replied.id
    });

    if (!config)
      return interaction.editReply("That message is not an application panel.");

    if (sub === "close") {
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

      await replied.edit({ embeds: [embed], components: [row] });

      return interaction.editReply("Application closed.");
    }

    if (sub === "open") {
      config.isOpen = true;
      await config.save();

      const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle(config.title)
        .setDescription(config.description)
        .setFooter({ text: "Status: OPEN" });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("application_entry")
          .setLabel("Entry")
          .setStyle(ButtonStyle.Primary)
      );

      await replied.edit({ embeds: [embed], components: [row] });

      return interaction.editReply("Application opened.");
    }

  }
};