import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

import ApplicationSession from "../models/ApplicationSession.js";
import ApplicationConfig from "../models/ApplicationConfig.js";

function createProgressBar(current, total) {
  const progressBlocks = 10;
  const filled = Math.round((current / total) * progressBlocks);
  const empty = progressBlocks - filled;

  return "▰".repeat(filled) + "▱".repeat(empty);
}

export default {
  name: "messageCreate",
  once: false,

  async execute(message, client) {

    if (message.guild) return;
    if (message.author.bot) return;

    const session = await ApplicationSession.findOne({
      userId: message.author.id,
      completed: false
    });

    if (!session) return;

    const config = await ApplicationConfig.findOne({
      panelMessageId: session.panelMessageId
    });

    if (!config) return;

    if (!config.isOpen) {
      return message.author.send(
        "❌ Sorry, this application is closed. Wait for it to be opened again."
      );
    }

    const currentIndex = session.currentQuestion;
    const questionText = config.questions[currentIndex];

    // Save answer
    session.answers.push({
      question: questionText,
      answer: message.content
    });

    session.currentQuestion += 1;

    const totalQuestions = config.questions.length;
    const currentProgress = session.currentQuestion;

    // ===============================
    // FINISHED ALL QUESTIONS
    // ===============================
    if (currentProgress >= totalQuestions) {

      await session.save();

      const embed = new EmbedBuilder()
        .setColor("#2ecc71")
        .setTitle("📝 Application Completed")
        .setDescription(
          `━━━━━━━━━━━━━━━━━━\n\n` +
          `You have answered **all ${totalQuestions} questions**.\n\n` +
          `Click **Submit Application** when you're ready.\n\n` +
          `━━━━━━━━━━━━━━━━━━`
        )
        .setFooter({
          text: "Destroyer YT Application System"
        })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`app_submit_${session._id}`)
          .setLabel("Submit Application")
          .setStyle(ButtonStyle.Success)
      );

      return message.author.send({
        embeds: [embed],
        components: [row]
      });
    }

    // ===============================
    // NEXT QUESTION
    // ===============================
    const nextQuestion = config.questions[currentProgress];

    const percent = Math.floor((currentProgress / totalQuestions) * 100);
    const progressBar = createProgressBar(currentProgress, totalQuestions);

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle(`📋 ${config.title}`)
      .setDescription(
        `━━━━━━━━━━━━━━━━━━\n` +
        `**Question ${currentProgress + 1} / ${totalQuestions}**\n\n` +
        `💬 ${nextQuestion}\n\n` +
        `━━━━━━━━━━━━━━━━━━`
      )
      .addFields({
        name: "📊 Progress",
        value: `${progressBar}  ${percent}%`,
        inline: false
      })
      .setFooter({
        text: "Reply below with your answer."
      })
      .setTimestamp();

    await session.save();

    return message.author.send({ embeds: [embed] });
  }
};