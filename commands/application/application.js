import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType
} from "discord.js";

import ApplicationConfig from "../../models/ApplicationConfig.js";

export default {
  data: new SlashCommandBuilder()
    .setName("application")
    .setDescription("Application system")

    .addSubcommand(sub =>
      sub
        .setName("setup")
        .setDescription("Setup application panel")
        .addStringOption(o =>
          o.setName("title").setDescription("Panel title").setRequired(true)
        )
        .addStringOption(o =>
          o.setName("description").setDescription("Panel description").setRequired(true)
        )
        .addChannelOption(o =>
          o.setName("channel").setDescription("Channel to send panel").setRequired(true)
        )
        .addStringOption(o =>
          o.setName("questions")
            .setDescription("Questions separated by | (max 10)")
            .setRequired(true)
        )
    )

    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {

    try {
      await interaction.deferReply({ ephemeral: true });

      const sub = interaction.options.getSubcommand();

      if (sub !== "setup") {
        return interaction.editReply("Invalid subcommand.");
      }

      const title = interaction.options.getString("title");
      const description = interaction.options.getString("description");
      const channel = interaction.options.getChannel("channel");
      const questionsRaw = interaction.options.getString("questions");

      // Validate channel
      if (!channel || channel.type !== ChannelType.GuildText) {
        return interaction.editReply("❌ Please select a TEXT channel.");
      }

      // Check bot permissions in that channel
      const botMember = interaction.guild.members.me;
      const perms = channel.permissionsFor(botMember);

      if (!perms.has("SendMessages") || !perms.has("ViewChannel")) {
        return interaction.editReply("❌ I don't have permission to send messages in that channel.");
      }

      // Parse questions
      const questions = questionsRaw
        .split("|")
        .map(q => q.trim())
        .filter(q => q.length > 0);

      if (questions.length < 1 || questions.length > 10) {
        return interaction.editReply("❌ You must provide between 1 and 10 questions.");
      }

      // Create embed
      const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: "Status: OPEN" });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("application_entry")
          .setLabel("Entry")
          .setStyle(ButtonStyle.Primary)
      );

      // Send panel
      const panelMessage = await channel.send({
        embeds: [embed],
        components: [row]
      });

      // Save config (upsert prevents duplicates)
      await ApplicationConfig.findOneAndUpdate(
        { panelMessageId: panelMessage.id },
        {
          guildId: interaction.guild.id,
          panelChannelId: channel.id,
          panelMessageId: panelMessage.id,
          title,
          description,
          questions,
          isOpen: true
        },
        { upsert: true }
      );

      return interaction.editReply("✅ Application panel successfully created.");
    }
    catch (err) {
      console.error("APPLICATION SETUP ERROR:", err);

      if (interaction.deferred || interaction.replied) {
        return interaction.editReply("❌ Setup failed. Check console.");
      } else {
        return interaction.reply({ content: "❌ Setup failed.", ephemeral: true });
      }
    }
  }
};