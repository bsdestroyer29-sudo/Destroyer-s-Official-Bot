import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";

import ApplicationConfig from "../models/ApplicationConfig.js";
import ApplicationSession from "../models/ApplicationSession.js";

const APPLICATION_REVIEW_CHANNEL_ID = "1475924505028333658";

export default {
  name: "interactionCreate",
  once: false,

  async execute(interaction, client) {

    // =================================================
    // ENTRY BUTTON
    // =================================================
    if (interaction.isButton() && interaction.customId === "application_entry") {

      await interaction.reply({
        content: "📩 Check your DMs to start the application.",
        ephemeral: true
      });

      const config = await ApplicationConfig.findOne({
        guildId: interaction.guild.id
      });

      if (!config) return;

      // Prevent double applications
      const existing = await ApplicationSession.findOne({
        userId: interaction.user.id,
        completed: false
      });

      if (existing) {
        return interaction.followUp({
          content: "❌ You already have an active application.",
          ephemeral: true
        });
      }

      const session = await ApplicationSession.create({
        guildId: interaction.guild.id,
        userId: interaction.user.id,
        answers: [],
        currentQuestion: 0,
        completed: false
      });

      const firstQuestion = config.questions[0];

      await interaction.user.send(
        `📝 **Application Started**\n\nQuestion 1:\n${firstQuestion}`
      );

      return;
    }

    // =================================================
    // SUBMIT BUTTON (from DM)
    // =================================================
    if (interaction.isButton() && interaction.customId.startsWith("app_submit_")) {

      const sessionId = interaction.customId.split("_")[2];
      const session = await ApplicationSession.findById(sessionId);
      if (!session) return;

      const reviewChannel = client.channels.cache.get(APPLICATION_REVIEW_CHANNEL_ID);
      if (!reviewChannel) {
        return interaction.reply({
          content: "❌ Review channel not found.",
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setColor("Purple")
        .setTitle("📄 New Application")
        .setDescription(
          session.answers
            .map((a, i) =>
              `**Q${i + 1}:** ${a.question}\n**A:** ${a.answer}\n`
            )
            .join("\n")
        )
        .addFields({
          name: "Applicant",
          value: `<@${session.userId}>`
        })
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

      session.completed = true;
      await session.save();

      return interaction.reply({
        content: "✅ Application submitted successfully.",
        ephemeral: true
      });
    }

    // =================================================
    // ACCEPT / DECLINE
    // =================================================
    if (interaction.isButton() && interaction.customId.startsWith("app_")) {

      const parts = interaction.customId.split("_");
      const action = parts[1];
      const sessionId = parts[2];

      if (!["accept", "decline"].includes(action)) return;

      const session = await ApplicationSession.findById(sessionId);
      if (!session) return;

      const applicant = await client.users.fetch(session.userId).catch(() => null);
      if (!applicant) return;

      const decision = action === "accept" ? "accepted" : "declined";

      // Notify applicant
      await applicant.send(
        action === "accept"
          ? "🎉 Your application has been accepted!"
          : "❌ Your application has been declined."
      ).catch(() => {});

      // Disable buttons
      await interaction.update({
        content: `Application ${decision} by ${interaction.user.tag}`,
        embeds: interaction.message.embeds,
        components: []
      });

      return;
    }

  }
};