import {
  SlashCommandBuilder,
  PermissionFlagsBits
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("id")
    .setDescription("Get IDs of different objects")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    // ROLE ID
    .addSubcommand(sub =>
      sub
        .setName("role")
        .setDescription("Get role ID")
        .addRoleOption(option =>
          option
            .setName("role")
            .setDescription("Select a role")
            .setRequired(true)
        )
    )

    // USER ID
    .addSubcommand(sub =>
      sub
        .setName("user")
        .setDescription("Get user ID")
        .addUserOption(option =>
          option
            .setName("user")
            .setDescription("Select a user")
            .setRequired(true)
        )
    )

    // CHANNEL ID
    .addSubcommand(sub =>
      sub
        .setName("channel")
        .setDescription("Get channel ID")
        .addChannelOption(option =>
          option
            .setName("channel")
            .setDescription("Select a channel")
            .setRequired(true)
        )
    )

    // SERVER ID
    .addSubcommand(sub =>
      sub
        .setName("server")
        .setDescription("Get server ID")
    ),

  async execute(interaction) {

    const sub = interaction.options.getSubcommand();

    if (sub === "role") {
      const role = interaction.options.getRole("role");
      return interaction.reply({
        content: `🎭 Role ID: \`${role.id}\``,
        ephemeral: true
      });
    }

    if (sub === "user") {
      const user = interaction.options.getUser("user");
      return interaction.reply({
        content: `👤 User ID: \`${user.id}\``,
        ephemeral: true
      });
    }

    if (sub === "channel") {
      const channel = interaction.options.getChannel("channel");
      return interaction.reply({
        content: `📁 Channel ID: \`${channel.id}\``,
        ephemeral: true
      });
    }

    if (sub === "server") {
      return interaction.reply({
        content: `🌍 Server ID: \`${interaction.guild.id}\``,
        ephemeral: true
      });
    }
  }
};