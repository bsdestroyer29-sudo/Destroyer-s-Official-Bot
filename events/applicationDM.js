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

    // If finished all questions
    if (session.currentQuestion >= config.questions.length) {

      await session.save();

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("✅ Application Complete")
        .setDescription(
          "You answered all questions.\n\nPress **Submit** when you're ready."
        )
        .setFooter({
          text: `Total Questions: ${config.questions.length}`
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

    // Send next question styled
    const nextQuestion = config.questions[session.currentQuestion];

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle(`📋 ${config.title}`)
      .setDescription(
        `### Question ${session.currentQuestion + 1} / ${config.questions.length}\n\n` +
        `**${nextQuestion}**`
      )
      .addFields({
        name: "Progress",
        value:
          createProgressBar(
            session.currentQuestion,
            config.questions.length
          ) +
          `\n${session.currentQuestion}/${config.questions.length}`
      })
      .setFooter({
        text: "Reply with your answer below."
      })
      .setTimestamp();

    await session.save();

    return message.author.send({ embeds: [embed] });
  }
};