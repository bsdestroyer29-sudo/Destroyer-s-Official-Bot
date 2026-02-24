import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("stafflist")
    .setDescription("View the server staff team"),

  async execute(interaction) {

    await interaction.deferReply(); // 🔥 important fix

    const STAFF_ROLES = [
      "1461793438084239492",
      "1471225745912103045",
      "1461793436675080295",
      "1461793435236307260",
      "1461793435018199206",
      "1461793004825083935",
      "1475872669344727201"
    ];

    // Fetch members safely
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

    await interaction.editReply({ embeds: [embed] });
  }
};