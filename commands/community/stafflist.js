import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("stafflist")
    .setDescription("View the server staff team"),

  async execute(interaction) {

    await interaction.deferReply();

    const STAFF_ROLES = [
      "1461793438084239492",
      "1471225745912103045",
      "1461793436675080295",
      "1461793435236307260",
      "1461793435018199206",
      "1461793004825083935",
      "1475872669344727201"
    ];

    // ❌ Roles that should NOT appear in the list
    const EXCLUDED_ROLES = [
      "1476271511718596770",
      "1476271520090292270",
      "1476271523831746580",
      "1476271526767624223",
      "1476271529682534461",
      "1476271532643979326"
    ];

    await interaction.guild.members.fetch();

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("👑 Destroyer Staff Team")
      .setDescription("The team that keeps the server running smoothly.")
      .setTimestamp();

    const listedMembers = new Set();
    let totalStaff = 0;

    for (const roleId of STAFF_ROLES) {

      // 🔥 Skip excluded roles
      if (EXCLUDED_ROLES.includes(roleId)) continue;

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

    await interaction.editReply({ embeds: [embed] });
  }
};
