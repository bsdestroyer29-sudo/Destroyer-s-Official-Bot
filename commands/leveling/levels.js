import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import Level from "../../models/Level.js";

export default {
  data: new SlashCommandBuilder()
    .setName("levels")
    .setDescription("Top level leaderboard"),

  async execute(interaction) {

    const top = await Level.aggregate([
      { $match: { guildId: interaction.guild.id } },

      // ✅ GROUP by userId so no duplicates can ever show
      {
        $group: {
          _id: "$userId",
          level: { $max: "$level" },

          // If duplicates exist, take the best xp among them
          xp: { $max: "$xp" }
        }
      },

      { $sort: { level: -1, xp: -1 } },
      { $limit: 10 }
    ]);

    if (!top.length) {
      return interaction.reply("No leveling data yet.");
    }

    const lines = top.map((u, i) =>
      `**${i + 1}.** <@${u._id}> — Level **${u.level}** (XP ${u.xp})`
    );

    const embed = new EmbedBuilder()
      .setColor("Gold")
      .setTitle("🏆 Level Leaderboard")
      .setDescription(lines.join("\n"))
      .setTimestamp();

    return interaction.reply({
      embeds: [embed],
      allowedMentions: { parse: [] } // ✅ prevents ping spam
    });
  }
};
