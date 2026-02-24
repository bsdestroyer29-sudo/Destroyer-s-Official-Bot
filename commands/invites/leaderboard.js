import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import Invite from "../../models/Invite.js";

export default {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Invite leaderboard"),

  async execute(interaction) {

    // 🔥 Aggregate & group by inviterId (removes duplicates)
    const top = await Invite.aggregate([
      { $match: { guildId: interaction.guild.id } },
      {
        $group: {
          _id: "$inviterId",
          invites: { $sum: "$invites" }
        }
      },
      { $sort: { invites: -1 } },
      { $limit: 10 }
    ]);

    if (!top.length)
      return interaction.reply("No invite data yet.");

    const description = top
      .map((user, index) =>
        `**${index + 1}.** <@${user._id}> — ${user.invites} invites`
      )
      .join("\n");

    const embed = new EmbedBuilder()
      .setColor("Gold")
      .setTitle("🏆 Invite Leaderboard")
      .setDescription(description)
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }
};