import {
  SlashCommandBuilder,
  PermissionFlagsBits
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("id")
    .setDescription("Get IDs quickly")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .addSubcommand(sub =>
      sub
        .setName("role")
        .setDescription("Get role ID")
        .addRoleOption(option =>
          option
            .setName("role")
            .setDescription("Select role")
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("user")
        .setDescription("Get user ID")
        .addUserOption(option =>
          option
            .setName("user")
            .setDescription("Select user")
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("channel")
        .setDescription("Get channel ID")
        .addChannelOption(option =>
          option
            .setName("channel")
            .setDescription("Select channel")
            .setRequired(true)
        )
    )

    .addSubcommand(sub =>
      sub
        .setName("server")
        .setDescription("Get server ID")
    ),

  async execute(interaction) {

    const sub = interaction.options.getSubcommand();
    let id;

    if (sub === "role") {
      id = interaction.options.getRole("role").id;
    }

    if (sub === "user") {
      id = interaction.options.getUser("user").id;
    }

    if (sub === "channel") {
      id = interaction.options.getChannel("channel").id;
    }

    if (sub === "server") {
      id = interaction.guild.id;
    }

    return interaction.reply({
      content: `\`\`\`\n${id}\n\`\`\``,
      ephemeral: true
    });
  }
};