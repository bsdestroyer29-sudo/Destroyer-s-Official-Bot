import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType
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
          o.setName("title").setDescription("Panel title").setRequired(true)
        )
        .addStringOption(o =>
          o.setName("description").setDescription("Panel description").setRequired(true)
        )
        .addChannelOption(o =>
          o.setName("panel_channel")
            .setDescription("Channel where the panel will be sent")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
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
    const panelChannel = interaction.options.getChannel("panel_channel");

    const questions = [];

    for (let i = 1; i <= 10; i++) {
      const q = interaction.options.getString(`question${i}`);
      if (q) questions.push(q);
    }

    if (questions.length < 1)
      return interaction.reply({ content: "❌ Minimum 1 question required.", ephemeral: true });

    if (questions.length > 10)
      return interaction.reply({ content: "❌ Maximum 10 questions allowed.", ephemeral: true });

    await ApplicationConfig.findOneAndUpdate(
      { guildId: interaction.guild.id },
      {
        guildId: interaction.guild.id,
        panelChannelId: panelChannel.id,
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

    await panelChannel.send({
      embeds: [embed],
      components: [row]
    });

    return interaction.reply({
      content: `✅ Application panel created in ${panelChannel}.`,
      ephemeral: true
    });
  }
};