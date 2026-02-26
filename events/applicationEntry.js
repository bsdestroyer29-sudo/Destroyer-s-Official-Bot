import { Events, EmbedBuilder } from "discord.js";
import ApplicationConfig from "../models/ApplicationConfig.js";
import ApplicationSession from "../models/ApplicationSession.js";

function createProgressBar(current, total) {
  const percent = Math.floor((current / total) * 10);
  return "🟦".repeat(percent) + "⬜".repeat(10 - percent);
}

export default {
  name: Events.InteractionCreate,
  once: false,

  async execute(interaction, client) {
    if (!interaction.isButton()) return;

    // ✅ Make sure this matches your entry button customId
    if (!interaction.customId.startsWith("application_entry")) return;

    // ✅ IMPORTANT: prevent "thinking stuck"
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    if (!guild) return interaction.editReply("❌ This can only be used in a server.");

    // Find panel config by the message that has the button (the panel message)
    const panelMessageId = interaction.message?.id;
    const config = await ApplicationConfig.findOne({ panelMessageId });

    if (!config) {
      return interaction.editReply("❌ Panel config not found. Ask staff to re-run setup.");
    }

    if (!config.isOpen) {
      return interaction.editReply("🔒 Sorry, this application is closed right now.");
    }

    // Prevent multi-sessions spam
    const existing = await ApplicationSession.findOne({
      userId: interaction.user.id,
      panelMessageId: config.panelMessageId,
      completed: false
    });

    if (existing) {
      return interaction.editReply("⚠️ You already have an application in progress. Check your DMs.");
    }

    // Create new session
    const session = await ApplicationSession.create({
      guildId: guild.id,
      userId: interaction.user.id,
      panelMessageId: config.panelMessageId,
      currentQuestion: 0,
      answers: [],
      completed: false,
      waitingForSubmit: false
    });

    // Send first question in DM (stylish embed)
    const firstQuestion = config.questions[0];

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle(`📝 ${config.title}`)
      .setDescription(
        `**Application Started**\n\n` +
        `### Question 1 / ${config.questions.length}\n` +
        `**${firstQuestion}**`
      )
      .addFields({
        name: "Progress",
        value: `${createProgressBar(0, config.questions.length)}\n0/${config.questions.length}`
      })
      .setFooter({ text: "Reply in this DM with your answer." });

    try {
      await interaction.user.send({ embeds: [embed] });
      await interaction.editReply("✅ Check your DMs — I sent your first question.");
    } catch {
      // ✅ If user has DMs closed, don't hang
      await ApplicationSession.deleteOne({ _id: session._id }).catch(() => {});
      await interaction.editReply(
        "❌ I couldn’t DM you.\nPlease enable DMs from server members and press **Entry** again."
      );
    }
  }
};