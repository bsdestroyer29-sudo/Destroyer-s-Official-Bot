import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import Level from "../../models/Level.js";

function xpToNext(level) {
  return 5 * (level ** 2) + 50 * level + 100;
}

export default {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Show your level and XP")
    .addUserOption(o =>
      o.setName("user").setDescription("User to check").setRequired(false)
    ),

  async execute(interaction) {

    const user = interaction.options.getUser("user") || interaction.user;

    const doc = await Level.findOne({
      guildId: interaction.guild.id,
      userId: user.id
    });

    const level = doc?.level ?? 0;
    const xp = doc?.xp ?? 0;
    const needed = xpToNext(level);

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle("📈 Rank")
      .addFields(
        { name: "User", value: `${user.tag} (${user.id})` },
        { name: "Level", value: `${level}`, inline: true },
        { name: "XP", value: `${xp} / ${needed}`, inline: true }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  }
};
