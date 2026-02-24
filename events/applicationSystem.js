import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";

import ApplicationConfig from "../models/ApplicationConfig.js";
import ApplicationSession from "../models/ApplicationSession.js";

export default {
  name: "interactionCreate",
  once: false,

  async execute(interaction, client) {

    // ================= ENTRY BUTTON =================
    if (interaction.isButton() && interaction.customId === "application_entry") {

      await interaction.reply({ content: "📩 Check your DMs.", ephemeral: true });

      const config = await ApplicationConfig.findOne({
        guildId: interaction.guild.id
      });

      if (!config) return;

      const session = await ApplicationSession.create({
        guildId: interaction.guild.id,
        userId: interaction.user.id,
        answers: [],
        currentQuestion: 0
      });

      const firstQuestion = config.questions[0];

      interaction.user.send(
        `📝 Application Started\n\nQuestion 1:\n${firstQuestion}`
      );
    }

    // ================= SUBMIT BUTTON =================
    if (interaction.isButton() && interaction.customId.startsWith("app_submit_")) {

      const sessionId = interaction.customId.split("_")[2];
      const session = await ApplicationSession.findById(sessionId);
      if (!session) return;

      const config = await ApplicationConfig.findOne({
        guildId: session.guildId
      });

      const reviewChannel = client.channels.cache.get(config.reviewChannelId);

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

      reviewChannel.send({ embeds: [embed], components: [row] });

      interaction.reply({ content: "✅ Application submitted.", ephemeral: true });

      session.completed = true;
      await session.save();
    }

    // ================= ACCEPT / DECLINE =================
    if (interaction.isButton() && interaction.customId.startsWith("app_")) {

      const [ , action, sessionId ] = interaction.customId.split("_");

      if (!["accept", "decline"].includes(action)) return;

      const session = await ApplicationSession.findById(sessionId);
      if (!session) return;

      const user = await client.users.fetch(session.userId);

      if (action === "accept") {
        await user.send("🎉 Your application has been accepted!");
      } else {
        await user.send("❌ Your application has been declined.");
      }

      interaction.update({
        content: `Application ${action}ed by ${interaction.user.tag}`,
        embeds: [],
        components: []
      });
    }

  }
};