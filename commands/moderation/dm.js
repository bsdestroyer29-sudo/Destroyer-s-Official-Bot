import {
  SlashCommandBuilder,
  PermissionFlagsBits
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("dm")
    .setDescription("Send a DM to a user")
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("User to DM")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("message")
        .setDescription("Message to send")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: "❌ Staff only.",
        ephemeral: true
      });
    }

    // 🔥 THIS prevents "application did not respond"
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser("user");
    const message = interaction.options.getString("message");

    if (target.bot) {
      return interaction.editReply("❌ You cannot DM bots.");
    }

    try {
      await target.send(message);
      await interaction.editReply(`✅ DM sent to ${target.tag}`);
    } catch {
      await interaction.editReply(
        `❌ Could not DM ${target.tag}. They may have DMs disabled.`
      );
    }
  }
};