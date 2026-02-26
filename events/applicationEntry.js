import { EmbedBuilder } from "discord.js";
import ApplicationConfig from "../models/ApplicationConfig.js";
import ApplicationSession from "../models/ApplicationSession.js";

function createProgressBar(current, total) {
  const percent = Math.floor((current / total) * 10);
  return "🟦".repeat(percent) + "⬜".repeat(10 - percent);
}

export default {
  async run(interaction) {
    if (!interaction.isButton()) return;

    // ✅ Defer first so Discord doesn't time out
    await interaction.deferReply({ ephemeral: true }).catch(() => {});

    const panelMessageId = interaction.message?.id;
    if (!panelMessageId) {
      return interaction.editReply("❌ Panel message not found.").catch(() => {});
    }

    const config = await ApplicationConfig.findOne({ panelMessageId });
    if (!config) {
      return interaction.editReply("❌ Panel config not found. Ask staff to re-run setup.").catch(() => {});
    }

    if (!config.isOpen) {
      return interaction.editReply("🔒 Sorry, this application is currently closed.").catch(() => {});
    }

    const existing = await ApplicationSession.findOne({
      userId: interaction.user.id,
      panelMessageId: config.panelMessageId,
      completed: false,
      submitted: false
    });

    if (existing) {
      return interaction.editReply("⚠️ You already started this application. Check your DMs.").catch(() => {});
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

    const total = config.questions?.length || 1;
    const firstQuestion = config.questions?.[0] || "No question configured.";

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle(`📝 ${config.title || "Application"}`)
      .setDescription(
        `**Application Started**\n\n` +
        `### Question 1 / ${total}\n\n` +
        `**${firstQuestion}**`
      )
      .addFields({
        name: "Progress",
        value: `${createProgressBar(0, total)}\n0/${total}`
      })
      .setFooter({ text: "Reply in this DM with your answer." })
      .setTimestamp();

    try {
      await interaction.user.send({ embeds: [embed] });
      return interaction.editReply("✅ Check your DMs — I sent the first question.").catch(() => {});
    } catch (err) {
      await ApplicationSession.deleteOne({ _id: session._id }).catch(() => {});
      return interaction.editReply(
        "❌ I can't DM you. Please enable DMs from server members and press Entry again."
      ).catch(() => {});
    }
  }
};
