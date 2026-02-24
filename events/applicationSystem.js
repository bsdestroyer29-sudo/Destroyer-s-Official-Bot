import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";

import ApplicationConfig from "../models/ApplicationConfig.js";
import ApplicationSession from "../models/ApplicationSession.js";

const APPLICATION_REVIEW_CHANNEL_ID = "1475924508333658";

export default {
  name: "interactionCreate",
  once: false,

  async execute(interaction, client) {

    if (!interaction.isButton()) return;

    // ENTRY
    if (interaction.customId === "application_entry") {

      const config = await ApplicationConfig.findOne({
        guildId: interaction.guild.id
      });

      if (!config)
        return interaction.reply({ content: "Not configured.", ephemeral: true });

      if (!config.isOpen) {
        await interaction.reply({ content: "📩 Check your DMs.", ephemeral: true });
        return interaction.user.send(
          "❌ Sorry, this application is closed, wait for it to be opened again."
        ).catch(() => {});
      }

      const existing = await ApplicationSession.findOne({
        userId: interaction.user.id,
        completed: false
      });

      if (existing)
        return interaction.reply({
          content: "❌ You already have an active application.",
          ephemeral: true
        });

      await interaction.reply({ content: "📩 Check your DMs.", ephemeral: true });

      const session = await ApplicationSession.create({
        guildId: interaction.guild.id,
        userId: interaction.user.id,
        answers: [],
        currentQuestion: 0,
        completed: false
      });

      return interaction.user.send(
        `📝 Application Started\n\nQuestion 1:\n${config.questions[0]}`
      );
    }

    // SUBMIT
    if (interaction.customId.startsWith("app_submit_")) {

      const sessionId = interaction.customId.split("_")[2];
      const session = await ApplicationSession.findById(sessionId);
      if (!session) return;

      const reviewChannel = client.channels.cache.get(APPLICATION_REVIEW_CHANNEL_ID);

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

      session.completed = true;
      await session.save();

      return interaction.reply({ content: "Application submitted.", ephemeral: true });
    }

    // ACCEPT / DECLINE
    if (interaction.customId.startsWith("app_accept_") || interaction.customId.startsWith("app_decline_")) {

      const action = interaction.customId.includes("accept") ? "accept" : "decline";
      const sessionId = interaction.customId.split("_")[2];

      const session = await ApplicationSession.findById(sessionId);
      if (!session) return;

      const user = await client.users.fetch(session.userId).catch(() => null);
      if (!user) return;

      await user.send(
        action === "accept"
          ? "🎉 Your application has been accepted!"
          : "❌ Your application has been declined."
      ).catch(() => {});

      await interaction.update({
        content: `Application ${action}ed by ${interaction.user.tag}`,
        embeds: interaction.message.embeds,
        components: []
      });
    }
  }
};