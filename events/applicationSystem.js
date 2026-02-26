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
   PANEL UPDATE FUNCTION
======================================================= */
export async function updatePanel(client, guildId, isOpen) {
  const config = await ApplicationConfig.findOne({ guildId });
  if (!config) return;

  const channel = await client.channels.fetch(config.panelChannelId).catch(() => null);
  if (!channel) return;

  const messages = await channel.messages.fetch({ limit: 20 });

  const panelMessage = messages.find(m =>
    m.components?.[0]?.components?.[0]?.customId === "application_entry"
  );

  if (!panelMessage) return;

  const newEmbed = new EmbedBuilder()
    .setColor(isOpen ? "Blue" : "Red")
    .setTitle(isOpen ? config.title : `🔒 CLOSED — ${config.title}`)
    .setDescription(config.description);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("application_entry")
      .setLabel(isOpen ? "Entry" : "Closed")
      .setStyle(isOpen ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(!isOpen)
  );

  await panelMessage.edit({
    embeds: [newEmbed],
    components: [row]
  }).catch(() => {});
}

/* =======================================================
   MAIN SYSTEM
======================================================= */
export default {
  name: "interactionCreate",
  once: false,

  async execute(interaction, client) {

    if (!interaction.isButton()) return;

    /* ===============================
       ENTRY BUTTON
    =============================== */
    if (interaction.customId === "application_entry") {

      const config = await ApplicationConfig.findOne({
        guildId: interaction.guild.id
      });

      if (!config)
        return interaction.reply({ content: "Application not configured.", ephemeral: true });

      if (!config.isOpen) {
        await interaction.reply({ content: "📩 Check your DMs.", ephemeral: true });
        return interaction.user.send(
          "❌ Sorry, this application is closed. Wait for it to be opened again."
        ).catch(() => {});
      }

      // Block if pending review exists
      const pending = await ApplicationSession.findOne({
        guildId: interaction.guild.id,
        userId: interaction.user.id,
        submitted: true,
        reviewed: false
      });

      if (pending) {
        return interaction.reply({
          content: "❌ You already submitted an application. Please wait for staff review.",
          ephemeral: true
        });
      }

      // Block if active unfinished session exists
      const active = await ApplicationSession.findOne({
        guildId: interaction.guild.id,
        userId: interaction.user.id,
        completed: false
      });

      await interaction.reply({ content: "📩 Check your DMs.", ephemeral: true });

await ApplicationSession.create({
  guildId: interaction.guild.id,
  userId: interaction.user.id,
  panelMessageId: interaction.message.id, // 🔥 CRITICAL FIX
  answers: [],
  currentQuestion: 0,
  completed: false,
  submitted: false,
  reviewed: false
});

      return interaction.user.send(
        `📝 **Application Started**\n\nQuestion 1:\n${config.questions[0]}`
      ).catch(() => {});
    }

    /* ===============================
       SUBMIT BUTTON
    =============================== */
    if (interaction.customId.startsWith("app_submit_")) {

      const sessionId = interaction.customId.split("_")[2];
      const session = await ApplicationSession.findById(sessionId);

      if (!session) {
        return interaction.update({
          content: "❌ This application session no longer exists.",
          components: []
        }).catch(() => {});
      }

      // Prevent double submit
      if (session.submitted === true) {
        return interaction.update({
          content: "✅ You already submitted this application.",
          components: []
        }).catch(() => {});
      }

      const reviewChannel = client.channels.cache.get(APPLICATION_REVIEW_CHANNEL_ID);
      if (!reviewChannel) {
        return interaction.update({
          content: "❌ Review channel not found.",
          components: []
        }).catch(() => {});
      }

      // Mark submitted BEFORE sending (anti-race)
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

      await reviewChannel.send({
        embeds: [embed],
        components: [row]
      });

      return interaction.update({
        content: "✅ Application submitted successfully.",
        components: []
      }).catch(() => {});
    }

    /* ===============================
       ACCEPT / DECLINE
    =============================== */
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

      // Notify applicant
      await applicant.send(
        action === "accept"
          ? "🎉 Your application has been accepted!"
          : "❌ Your application has been declined."
      ).catch(() => {});

      session.reviewed = true;
      await session.save();

      /* ===============================
         LOG FIXED VERSION
      =============================== */
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

        logChannel.send({
          embeds: [logEmbed],
          allowedMentions: { parse: [] }
        }).catch(() => {});
      }

      return interaction.update({
        content: `Application ${decisionText} by ${interaction.user.tag}`,
        embeds: interaction.message.embeds,
        components: []
      }).catch(() => {});
    }
  }
};