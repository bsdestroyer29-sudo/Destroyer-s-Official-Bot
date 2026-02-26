import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";

import ApplicationConfig from "../models/ApplicationConfig.js";
import ApplicationSession from "../models/ApplicationSession.js";

const APPLICATION_REVIEW_CHANNEL_ID = "1475924505028333658";
const LOG_CHANNEL_ID = "1475508584744747162";

/* =======================================================
   PANEL UPDATE (BY PANEL MESSAGE ID)
======================================================= */
export async function updatePanelByMessageId(client, panelMessageId, isOpen) {
  const config = await ApplicationConfig.findOne({ panelMessageId });
  if (!config) return;

  const channel = await client.channels.fetch(config.panelChannelId).catch(() => null);
  if (!channel) return;

  const msg = await channel.messages.fetch(config.panelMessageId).catch(() => null);
  if (!msg) return;

  const embed = new EmbedBuilder()
    .setColor(isOpen ? "Blue" : "Red")
    .setTitle(config.title)
    .setDescription(config.description)
    .setFooter({ text: `Status: ${isOpen ? "OPEN" : "CLOSED"}` });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("application_entry")
      .setLabel(isOpen ? "Entry" : "Closed")
      .setStyle(isOpen ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(!isOpen)
  );

  await msg.edit({ embeds: [embed], components: [row] }).catch(() => {});
}

/* =======================================================
   MAIN SYSTEM
======================================================= */
export default {
  name: "interactionCreate",
  once: false,

  async execute(interaction, client) {
    if (!interaction.isButton()) return;

    // ===============================
    // SUBMIT BUTTON
    // ===============================
    if (interaction.customId.startsWith("app_submit_")) {

      const sessionId = interaction.customId.split("_")[2];
      const session = await ApplicationSession.findById(sessionId);

      if (!session) {
        return interaction.update({
          content: "❌ This application session no longer exists.",
          components: []
        }).catch(() => {});
      }

      if (session.submitted === true) {
        return interaction.update({
          content: "✅ You already submitted this application.",
          components: []
        }).catch(() => {});
      }

      const reviewChannel = client.channels.cache.get(APPLICATION_REVIEW_CHANNEL_ID);
      if (!reviewChannel) {
        return interaction.update({
          content: "❌ Review channel not found. Tell staff.",
          components: []
        }).catch(() => {});
      }

      session.completed = true;
      session.submitted = true;
      session.reviewed = false;
      await session.save();

      const embed = new EmbedBuilder()
        .setColor("Purple")
        .setTitle("📄 New Application")
        .setDescription(
          session.answers.map((a, i) =>
            `**Q${i + 1}:** ${a.question}\n**A:** ${a.answer}\n`
          ).join("\n")
        )
        .addFields({ name: "Applicant", value: `<@${session.userId}>` })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`app_accept_${session._id}`)
          .setLabel("Accept")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`app_decline_${session._id}`)
          .setLabel("Decline")
          .setStyle(ButtonStyle.Danger)
      );

      await reviewChannel.send({ embeds: [embed], components: [row] });

      return interaction.update({
        content: "✅ Application submitted successfully.",
        components: []
      }).catch(() => {});
    }

    // ===============================
    // ACCEPT / DECLINE
    // ===============================
    if (
      interaction.customId.startsWith("app_accept_") ||
      interaction.customId.startsWith("app_decline_")
    ) {

      const action = interaction.customId.includes("accept") ? "accept" : "decline";
      const sessionId = interaction.customId.split("_")[2];

      const session = await ApplicationSession.findById(sessionId);
      if (!session) return;

      const applicant = await client.users.fetch(session.userId).catch(() => null);
      if (!applicant) return;

      const decisionText = action === "accept" ? "accepted" : "declined";

      await applicant.send(
        action === "accept"
          ? "🎉 Your application has been accepted!"
          : "❌ Your application has been declined."
      ).catch(() => {});

      session.reviewed = true;
      await session.save();

      const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);
      if (logChannel) {
        const reviewerText = `${interaction.user.tag} (${interaction.user.id})`;
        const applicantText = `${applicant.tag} (${applicant.id})`;

        const logEmbed = new EmbedBuilder()
          .setColor(action === "accept" ? "Green" : "Red")
          .setTitle(`📋 Application ${decisionText.toUpperCase()}`)
          .addFields(
            { name: "Applicant", value: applicantText },
            { name: "Reviewed By", value: reviewerText }
          )
          .setTimestamp();

        logChannel.send({ embeds: [logEmbed], allowedMentions: { parse: [] } }).catch(() => {});
      }

      return interaction.update({
        content: `Application ${decisionText} by ${interaction.user.tag}`,
        embeds: interaction.message.embeds,
        components: []
      }).catch(() => {});
    }
  }
};
