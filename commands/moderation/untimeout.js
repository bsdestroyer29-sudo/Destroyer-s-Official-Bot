import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} from "discord.js";

const LOG_CHANNEL_ID = "1475508584744747162";

export default {
  data: new SlashCommandBuilder()
    .setName("untimeout")
    .setDescription("Remove timeout from a member")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)

    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("User to remove timeout from")
        .setRequired(true)
    ),

  async execute(interaction) {

    const member = interaction.options.getMember("user");

    if (!member)
      return interaction.reply({
        content: "User not found.",
        ephemeral: true
      });

    // Cannot untimeout yourself
    if (member.id === interaction.user.id)
      return interaction.reply({
        content: "You cannot untimeout yourself.",
        ephemeral: true
      });

    // Prevent touching admins
    if (member.permissions.has(PermissionFlagsBits.Administrator))
      return interaction.reply({
        content: "You cannot modify this user.",
        ephemeral: true
      });

    // Role hierarchy check
    if (member.roles.highest.position >= interaction.member.roles.highest.position)
      return interaction.reply({
        content: "You cannot untimeout someone with equal or higher role.",
        ephemeral: true
      });

    if (!member.communicationDisabledUntil)
      return interaction.reply({
        content: "This user is not timed out.",
        ephemeral: true
      });

    await member.timeout(null).catch(() => {
      return interaction.reply({
        content: "Failed to remove timeout.",
        ephemeral: true
      });
    });

    // DM user
    await member.send(
      `✅ Your timeout in **${interaction.guild.name}** has been removed.`
    ).catch(() => {});

    // Log
    const logChannel = interaction.client.channels.cache.get(LOG_CHANNEL_ID);

    if (logChannel) {
      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("✅ Timeout Removed")
        .addFields(
          { name: "User", value: `<@${member.id}>` },
          { name: "Moderator", value: `<@${interaction.user.id}>` }
        )
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    }

    return interaction.reply({
      content: `✅ Timeout removed from <@${member.id}>.`,
      ephemeral: true
    });
  }
};