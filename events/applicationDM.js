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
    if (message.guild) return;
    if (message.author.bot) return;

    // Get all active sessions for this user
    const sessions = await ApplicationSession.find({
      userId: message.author.id,
      completed: false,
      submitted: false,
      reviewed: false
    }).sort({ createdAt: -1 });

    if (!sessions.length) return;

    // ✅ If duplicates exist, delete all but the newest
    if (sessions.length > 1) {
      const idsToDelete = sessions.slice(1).map(s => s._id);
      await ApplicationSession.deleteMany({ _id: { $in: idsToDelete } });
    }

    const session = sessions[0];

    const config = await ApplicationConfig.findOne({
      panelMessageId: session.panelMessageId
    });

    if (!config) {
      session.completed = true;
      await session.save().catch(() => {});
      return message.author.send(
        "❌ Application config not found. Ask staff to re-run setup."
      ).catch(() => {});
    }

    if (!config.isOpen) {
      return message.author.send(
        "🔒 Sorry, this application is closed. Wait for it to be opened again."
      ).catch(() => {});
    }

    if (session.waitingForSubmit) return;

    const total = config.questions.length;
    const idx = session.currentQuestion;

    if (idx >= total) {
      session.waitingForSubmit = true;
      await session.save().catch(() => {});
      return;
    }

    const questionText = config.questions[idx];

    session.answers.push({
      question: questionText,
      answer: message.content
    });
    session.currentQuestion += 1;

    // ✅ Finished all questions -> atomic lock prevents double submit screen
    if (session.currentQuestion >= total) {
      const locked = await ApplicationSession.findOneAndUpdate(
        { _id: session._id, waitingForSubmit: false },
        { $set: { waitingForSubmit: true, answers: session.answers } }
      );
      if (!locked) return; // another event already sent the submit screen

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

      return message.author.send({ embeds: [doneEmbed], components: [row] }).catch(() => {});
    }

    await session.save().catch(() => {});

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

    return message.author.send({ embeds: [embed] }).catch(() => {});
  }
};