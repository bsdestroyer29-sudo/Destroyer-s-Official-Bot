import { EmbedBuilder } from "discord.js";
import ApplicationConfig from "../models/ApplicationConfig.js";
import ApplicationSession from "../models/ApplicationSession.js";

function createProgressBar(current, total) {
  const percent = Math.floor((current / total) * 10);
  return "🟦".repeat(percent) + "⬜".repeat(10 - percent);
}

export default {
  // called by interactionRouter
  async run(interaction) {
    const panelMessageId = interaction.message?.id;

    const config = await ApplicationConfig.findOne({ panelMessageId });
    if (!config) return interaction.editReply("❌ Panel config not found. Re-run setup.");

    if (!config.isOpen) {
      return interaction.editReply("🔒 Sorry, this application is closed.");
    }

    const existing = await ApplicationSession.findOne({
      userId: interaction.user.id,
      panelMessageId: config.panelMessageId,
      completed: false
    });

    if (existing) {
      return interaction.editReply("⚠️ You already started this application. Check your DMs.");
    }

    const session = await ApplicationSession.create({
      guildId: interaction.guild.id,
      userId: interaction.user.id,
      panelMessageId: config.panelMessageId,
      currentQuestion: 0,
      answers: [],
      completed: false,
      waitingForSubmit: false
    });

    const total = config.questions.length || 1;
    const firstQ = config.questions[0] || "No question found.";

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle(`📝 ${config.title || "Application"}`)
      .setDescription(
        `**Application Started**\n\n` +
        `### Question 1 / ${total}\n` +
        `**${firstQ}**`
      )
      .addFields({
        name: "Progress",
        value: `${createProgressBar(0, total)}\n0/${total}`
      })
      .setFooter({ text: "Reply in this DM with your answer." })
      .setTimestamp();

    try {
      await interaction.user.send({ embeds: [embed] });
      return interaction.editReply("✅ Check your DMs — I sent the first question.");
    } catch {
      await ApplicationSession.deleteOne({ _id: session._id }).catch(() => {});
      return interaction.editReply("❌ I can’t DM you. Enable DMs and press Entry again.");
    }
  }
};