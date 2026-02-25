import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} from "discord.js";

const LOG_CHANNEL_ID = "1475508584744747162";

export default {
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Timeout a member")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)

    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("User to timeout")
        .setRequired(true)
    )

    .addIntegerOption(option =>
      option
        .setName("minutes")
        .setDescription("Timeout duration in minutes")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(10080) // max 7 days (Discord limit)
    )

    .addStringOption(option =>
      option
        .setName("reason")
        .setDescription("Reason for timeout")
        .setRequired(false)
    ),

  async execute(interaction) {

    const member = interaction.options.getMember("user");
    const minutes = interaction.options.getInteger("minutes");
    const reason =
      interaction.options.getString("reason") || "No reason provided.";

    if (!member)
      return interaction.reply({
        content: "User not found.",
        ephemeral: true
      });

    // Prevent self-timeout
    if (member.id === interaction.user.id)
      return interaction.reply({
        content: "You cannot timeout yourself.",
        ephemeral: true
      });

    // Prevent timing out admins
    if (member.permissions.has(PermissionFlagsBits.Administrator))
      return interaction.reply({
        content: "You cannot timeout this user.",
        ephemeral: true
      });

    // Role hierarchy check
    if (member.roles.highest.position >= interaction.member.roles.highest.position)
      return interaction.reply({
        content: "You cannot timeout someone with equal or higher role.",
        ephemeral: true
      });

    const durationMs = minutes * 60 * 1000;

    await member.timeout(durationMs, reason).catch(() => {
      return interaction.reply({
        content: "Failed to timeout member.",
        ephemeral: true
      });
    });

    // DM user
    await member.send(
      `⏳ You have been timed out in **${interaction.guild.name}** for ${minutes} minute(s).\nReason: ${reason}`
    ).catch(() => {});

    // Log
    const logChannel = interaction.client.channels.cache.get(LOG_CHANNEL_ID);

    if (logChannel) {
      const embed = new EmbedBuilder()
        .setColor("DarkOrange")
        .setTitle("⏳ Member Timed Out")
        .addFields(
          { name: "User", value: `<@${member.id}>` },
          { name: "Moderator", value: `<@${interaction.user.id}>` },
          { name: "Duration", value: `${minutes} minute(s)` },
          { name: "Reason", value: reason }
        )
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    }

    return interaction.reply({
      content: `⏳ <@${member.id}> has been timed out for ${minutes} minute(s).`,
      ephemeral: true
    });
  }
};