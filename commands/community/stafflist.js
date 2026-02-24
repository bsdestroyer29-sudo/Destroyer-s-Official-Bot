import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("stafflist")
    .setDescription("View the server staff team"),

  async execute(interaction) {

    const STAFF_ROLES = [
      "1461793438084239492",
      "1471225745912103045",
      "1461793436675080295",
      "1461793435236307260",
      "1461793435018199206",
      "1461793004825083935"
    ];

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("👑 Destroyer Staff Team")
      .setDescription("The team that keeps the server running smoothly.")
      .setTimestamp();

    let totalStaff = 0;

    for (const roleId of STAFF_ROLES) {
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) continue;

      const members = role.members
        .map(member => `<@${member.id}>`)
        .join("\n");

      totalStaff += role.members.size;

      embed.addFields({
        name: `${role.name} (${role.members.size})`,
        value: members || "No members",
        inline: false
      });
    }

    embed.setFooter({ text: `Total Staff: ${totalStaff}` });

    await interaction.reply({ embeds: [embed] });
  }
};
