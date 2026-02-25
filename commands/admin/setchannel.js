import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("setchannel")
    .setDescription("Channel configuration tools")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)

    .addSubcommand(sub =>
      sub
        .setName("permissions")
        .setDescription("Apply permission template to a channel")
        .addChannelOption(option =>
          option
            .setName("channel")
            .setDescription("Channel to modify")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName("template")
            .setDescription("Permission template")
            .setRequired(true)
            .addChoices(
              { name: "🟢 Normal Chat", value: "normal" },
              { name: "🔒 Locked", value: "locked" },
              { name: "👁 View Only", value: "viewonly" },
              { name: "🛡 Staff Only", value: "staff" },
              { name: "📢 Announcements", value: "announce" }
            )
        )
    ),

  async execute(interaction) {

    const channel = interaction.options.getChannel("channel");
    const template = interaction.options.getString("template");

    const everyoneRole = interaction.guild.roles.everyone;

    if (!channel)
      return interaction.reply({ content: "Channel not found.", ephemeral: true });

    let permissions = {};

    switch (template) {

      case "normal":
        permissions = {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        };
        break;

      case "locked":
        permissions = {
          SendMessages: false
        };
        break;

      case "viewonly":
        permissions = {
          ViewChannel: true,
          SendMessages: false,
          AddReactions: false
        };
        break;

      case "staff":
        permissions = {
          ViewChannel: false
        };
        break;

      case "announce":
        permissions = {
          ViewChannel: true,
          SendMessages: false,
          AddReactions: false
        };
        break;
    }

    await channel.permissionOverwrites.edit(everyoneRole, permissions);

    return interaction.reply({
      content: `✅ Applied **${template}** template to ${channel}.`,
      ephemeral: true
    });
  }
};
