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
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    .addSubcommand(sub => {
      sub
        .setName("setup")
        .setDescription("Setup application panel")
        .addStringOption(o =>
          o.setName("title")
            .setDescription("Panel title")
            .setRequired(true)
        )
        .addStringOption(o =>
          o.setName("description")
            .setDescription("Panel description")
            .setRequired(true)
        )
        .addChannelOption(o =>
          o.setName("review_channel")
            .setDescription("Where applications will be sent")
            .setRequired(true)
        );

      // Add 10 optional question slots
      for (let i = 1; i <= 10; i++) {
        sub.addStringOption(o =>
          o.setName(`question${i}`)
            .setDescription(`Question ${i}`)
            .setRequired(i === 1) // Only first required
        );
      }

      return sub;
    }),

  async execute(interaction) {

    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: "❌ Admin only.",
        ephemeral: true
      });
    }

    const title = interaction.options.getString("title");
    const description = interaction.options.getString("description");
    const reviewChannel = interaction.options.getChannel("review_channel");

    const questions = [];

    for (let i = 1; i <= 10; i++) {
      const q = interaction.options.getString(`question${i}`);
      if (q) questions.push(q);
    }

    // Safety validation
    if (questions.length < 1) {
      return interaction.reply({
        content: "❌ You must provide at least 1 question.",
        ephemeral: true
      });
    }

    if (questions.length > 10) {
      return interaction.reply({
        content: "❌ Maximum 10 questions allowed.",
        ephemeral: true
      });
    }

    await ApplicationConfig.findOneAndUpdate(
      { guildId: interaction.guild.id },
      {
        guildId: interaction.guild.id,
        panelChannelId: interaction.channel.id,
        reviewChannelId: reviewChannel.id,
        title,
        description,
        questions
      },
      { upsert: true }
    );

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle(title)
      .setDescription(description);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("application_entry")
        .setLabel("Entry")
        .setStyle(ButtonStyle.Success)
    );

    await interaction.channel.send({
      embeds: [embed],
      components: [row]
    });

    return interaction.reply({
      content: `✅ Application panel created with ${questions.length} questions.`,
      ephemeral: true
    });
  }
};