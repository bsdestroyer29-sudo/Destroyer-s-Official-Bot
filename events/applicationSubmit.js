import { EmbedBuilder } from "discord.js";
import ApplicationSession from "../models/ApplicationSession.js";
import ApplicationConfig from "../models/ApplicationConfig.js";

const REVIEW_CHANNEL_ID = (process.env.APPLICATION_REVIEW_CHANNEL_ID || "").trim();

export default {
  async run(interaction, client) {
    const sessionId = interaction.customId.replace("app_submit_", "");
    const session = await ApplicationSession.findById(sessionId);

    if (!session) return interaction.editReply("❌ Session not found.");
    if (String(session.userId) !== String(interaction.user.id)) {
      return interaction.editReply("❌ This isn’t your application.");
    }
    if (session.completed) return interaction.editReply("✅ Already submitted.");

    session.completed = true;
    await session.save();

    const config = await ApplicationConfig.findOne({ panelMessageId: session.panelMessageId });

    if (REVIEW_CHANNEL_ID) {
      const ch = await client.channels.fetch(REVIEW_CHANNEL_ID).catch(() => null);
      if (ch?.isTextBased()) {
        const answersText = session.answers
          .map((a, i) => `**${i + 1}. ${a.question}**\n${a.answer}`)
          .join("\n\n");

        const embed = new EmbedBuilder()
          .setColor("Green")
          .setTitle("📨 New Application Submitted")
          .setDescription(
            `User: <@${session.userId}>\n` +
            `Type: **${config?.title || "Application"}**\n\n` +
            answersText.slice(0, 3800)
          )
          .setTimestamp();

        await ch.send({ embeds: [embed] }).catch(() => {});
      }
    }

    return interaction.editReply("✅ Submitted! Staff will review it.");
  }
};