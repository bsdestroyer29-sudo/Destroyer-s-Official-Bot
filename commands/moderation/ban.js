import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} from "discord.js";

const LOG_CHANNEL_ID = "1475508584744747162";

export default {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a member")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o =>
      o.setName("user").setDescription("User to ban").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("reason").setDescription("Reason").setRequired(false)
    ),

  async execute(interaction) {

    const member = interaction.options.getMember("user");
    const reason = interaction.options.getString("reason") || "No reason provided.";

    if (!member)
      return interaction.reply({ content: "User not found.", ephemeral: true });

    if (member.roles.highest.position >= interaction.member.roles.highest.position)
      return interaction.reply({ content: "Cannot ban this user.", ephemeral: true });

    await member.ban({ reason });

    const logChannel = interaction.client.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) {
      logChannel.send(`🔨 ${member.user.tag} banned by ${interaction.user.tag} | Reason: ${reason}`);
    }

    return interaction.reply({ content: `🔨 ${member.user.tag} banned.`, ephemeral: true });
  }
};