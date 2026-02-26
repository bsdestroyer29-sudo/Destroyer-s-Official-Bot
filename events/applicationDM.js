import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

import ApplicationSession from "../models/ApplicationSession.js";
import ApplicationConfig from "../models/ApplicationConfig.js";

function createProgressBar(current, total) {
  const percent = Math.floor((current / total) * 10);
  return "🟦".repeat(percent) + "⬜".repeat(10 - percent);
}

export default {
  name: "messageCreate",
  once: false,

  async execute(message) {
    // Only DMs
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

    if (!config) {
      return message.author.send("❌ Application config not found. Ask staff to re-run setup.");
    }

    if (!config.isOpen) {
      return message.author.send("🔒 Sorry, this application is closed. Wait for it to be opened again.");
    }

    // If finished questions and waiting for submit, ignore extra messages
    if (session.waitingForSubmit) {
      return;
    }

    const total = config.questions.length;
    const idx = session.currentQuestion;

    // Safety guard
    if (idx >= total) {
      session.waitingForSubmit = true;
      await session.save();
      return;
    }

    const questionText = config.questions[idx];

    // Save answer
    session.answers.push({
      question: questionText,
      answer: message.content
    });

    session.currentQuestion += 1;

    // Finished all questions -> show Submit button ONCE
    if (session.currentQuestion >= total) {
      session.waitingForSubmit = true;
      await session.save();

      const doneEmbed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("✅ Application Complete")
        .setDescription("You answered all questions.\n\nPress **Submit** when you're ready.")
        .addFields({
          name: "Progress",
          value: `${createProgressBar(total, total)}\n${total}/${total}`
        })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`app_submit_${session._id}`)
          .setLabel("Submit Application")
          .setStyle(ButtonStyle.Success)
      );

      return message.author.send({ embeds: [doneEmbed], components: [row] });
    }

    // Send next question (stylish)
    await session.save();

    const nextQ = config.questions[session.currentQuestion];

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle(`📝 ${config.title}`)
      .setDescription(
        `**Application in progress**\n\n` +
        `### Question ${session.currentQuestion + 1} / ${total}\n` +
        `**${nextQ}**`
      )
      .addFields({
        name: "Progress",
        value: `${createProgressBar(session.currentQuestion, total)}\n${session.currentQuestion}/${total}`
      })
      .setFooter({ text: "Reply in this DM with your answer." })
      .setTimestamp();

    return message.author.send({ embeds: [embed] });
  }
};