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
          o.setName("title").setRequired(true)
        )
        .addStringOption(o =>
          o.setName("description").setRequired(true)
        );

      for (let i = 1; i <= 10; i++) {
        sub.addStringOption(o =>
          o.setName(`question${i}`)
            .setDescription(`Question ${i}`)
            .setRequired(i === 1)
        );
      }

      return sub;
    }),

  async execute(interaction) {

    const title = interaction.options.getString("title");
    const description = interaction.options.getString("description");

    const questions = [];

    for (let i = 1; i <= 10; i++) {
      const q = interaction.options.getString(`question${i}`);
      if (q) questions.push(q);
    }

    await ApplicationConfig.findOneAndUpdate(
      { guildId: interaction.guild.id },
      {
        guildId: interaction.guild.id,
        panelChannelId: interaction.channel.id,
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

    interaction.reply({
      content: `✅ Application panel created with ${questions.length} questions.`,
      ephemeral: true
    });
  }
};