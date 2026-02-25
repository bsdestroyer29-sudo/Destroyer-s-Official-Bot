import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import Level from "../../models/Level.js";

export default {
  data: new SlashCommandBuilder()
    .setName("levels")
    .setDescription("Top level leaderboard"),

  async execute(interaction) {

    const top = await Level.find({ guildId: interaction.guild.id })
      .sort({ level: -1, xp: -1 })
      .limit(10);

    if (!top.length) return interaction.reply("No leveling data yet.");

    const lines = top.map((u, i) =>
      `**${i + 1}.** <@${u.userId}> — Level **${u.level}** (XP ${u.xp})`
    );

    const embed = new EmbedBuilder()
      .setColor("Gold")
      .setTitle("🏆 Level Leaderboard")
      .setDescription(lines.join("\n"))
      .setTimestamp();

    return interaction.reply({
      embeds: [embed],
      // If you don’t want pings here either, change to show tags instead.
      allowedMentions: { parse: [] }
    });
  }
};
