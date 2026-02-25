import ApplicationConfig from "../models/ApplicationConfig.js";
import ApplicationSession from "../models/ApplicationSession.js";

export default {
  name: "interactionCreate",
  once: false,

  async execute(interaction) {

    if (!interaction.isButton()) return;
    if (interaction.customId !== "application_entry") return;

    await interaction.deferReply({ ephemeral: true });

    const config = await ApplicationConfig.findOne({
      panelMessageId: interaction.message.id
    });

    if (!config)
      return interaction.editReply("Panel config not found.");

    if (!config.isOpen)
      return interaction.editReply("Sorry, this application is closed, wait for it to be opened again.");

    const existing = await ApplicationSession.findOne({
      userId: interaction.user.id,
      panelMessageId: config.panelMessageId,
      completed: false
    });

    if (existing)
      return interaction.editReply("You already have an active application.");

    await ApplicationSession.create({
      guildId: interaction.guild.id,
      userId: interaction.user.id,
      panelMessageId: config.panelMessageId
    });

    await interaction.user.send(
      `Question 1:\n${config.questions[0]}`
    ).catch(() => {});

    return interaction.editReply("Check your DMs.");
  }
};