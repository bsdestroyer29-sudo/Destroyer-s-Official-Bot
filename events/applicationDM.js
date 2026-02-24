import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

import ApplicationSession from "../models/ApplicationSession.js";
import ApplicationConfig from "../models/ApplicationConfig.js";

export default {
  name: "messageCreate",
  once: false,

  async execute(message, client) {

    // Only DMs
    if (message.guild) return;
    if (message.author.bot) return;

    const session = await ApplicationSession.findOne({
      userId: message.author.id,
      completed: false
    });

    if (!session) return;

    const config = await ApplicationConfig.findOne({
      guildId: session.guildId
    });

    if (!config) return;

    const question = config.questions[session.currentQuestion];

    // Save answer
    session.answers.push({
      question,
      answer: message.content
    });

    session.currentQuestion += 1;

    // If finished all questions
    if (session.currentQuestion >= config.questions.length) {

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`app_submit_${session._id}`)
          .setLabel("Submit")
          .setStyle(ButtonStyle.Primary)
      );

      await message.author.send({
        content: "✅ All questions answered.\nPress **Submit** to send your application.",
        components: [row]
      });

      await session.save();
      return;
    }

    // Send next question
    const nextQuestion = config.questions[session.currentQuestion];

    await message.author.send(
      `Question ${session.currentQuestion + 1}:\n${nextQuestion}`
    );

    await session.save();
  }
};