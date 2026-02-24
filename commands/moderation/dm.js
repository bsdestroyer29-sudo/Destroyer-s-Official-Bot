import {
  SlashCommandBuilder,
  PermissionFlagsBits
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("dm")
    .setDescription("Send a direct message to a user")
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

    // Extra safety check
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: "❌ You need Manage Messages permission.",
        ephemeral: true
      });
    }

    const target = interaction.options.getUser("user");
    const message = interaction.options.getString("message");

    if (target.bot) {
      return interaction.reply({
        content: "❌ You cannot DM bots.",
        ephemeral: true
      });
    }

    try {
      await target.send(message);

      await interaction.reply({
        content: `✅ Successfully sent DM to ${target.tag}`,
        ephemeral: true
      });

    } catch (error) {
      await interaction.reply({
        content: `❌ Could not DM ${target.tag}. They may have DMs disabled.`,
        ephemeral: true
      });
    }
  }
};