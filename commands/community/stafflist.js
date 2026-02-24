import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("stafflist")
    .setDescription("View the server staff team"),

  async execute(interaction) {

    // 🔥 Your real role IDs
    const STAFF_ROLES = [
      "OWNER_ROLE_ID",
      "COOWNER_ROLE_ID",
      "ADMIN_ROLE_ID",
      "MODERATOR_ROLE_ID",
      "SUPPORT_HELPER_ROLE_ID",
      "HELPER_ROLE_ID"
    ];

    // 🚨 Force fetch all members (important fix)
    await interaction.guild.members.fetch();

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("👑 Destroyer Staff Team")
      .setDescription("The team that keeps the server running smoothly.")
      .setTimestamp();

    const listedMembers = new Set();
    let totalStaff = 0;

    for (const roleId of STAFF_ROLES) {
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) continue;

      const members = role.members
        .filter(member => !listedMembers.has(member.id))
        .map(member => {
          listedMembers.add(member.id);
          return `<@${member.id}>`;
        });

      totalStaff += members.length;

      embed.addFields({
        name: `${role.name} (${members.length})`,
        value: members.length ? members.join("\n") : "No members",
        inline: false
      });
    }

    embed.setFooter({ text: `Total Unique Staff: ${totalStaff}` });

    await interaction.reply({ embeds: [embed] });
  }
};