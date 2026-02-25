import {
  SlashCommandBuilder,
  PermissionFlagsBits
} from "discord.js";

const LOG_CHANNEL_ID = "1475508584744747162";

export default {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(o =>
      o.setName("user").setDescription("User to kick").setRequired(true)
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
      return interaction.reply({ content: "Cannot kick this user.", ephemeral: true });

    await member.kick(reason);

    const logChannel = interaction.client.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) {
      logChannel.send(`👢 ${member.user.tag} kicked by ${interaction.user.tag} | Reason: ${reason}`);
    }

    return interaction.reply({ content: `👢 ${member.user.tag} kicked.`, ephemeral: true });
  }
};