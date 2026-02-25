import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} from "discord.js";

import Level from "../../models/Level.js";

const LOG_CHANNEL_ID = "1475508584744747162";

// Put your role IDs here (same as levelingSystem.js)
const LEVEL_10_ROLE_ID = "1461793005391446087";
const LEVEL_50_ROLE_ID = "1461793006200946749";
const LEVEL_100_ROLE_ID = "1461793007606169743";

async function applyLevelRoles(member, level) {
  const add = [];
  if (LEVEL_10_ROLE_ID && level >= 10) add.push(LEVEL_10_ROLE_ID);
  if (LEVEL_50_ROLE_ID && level >= 50) add.push(LEVEL_50_ROLE_ID);
  if (LEVEL_100_ROLE_ID && level >= 100) add.push(LEVEL_100_ROLE_ID);

  if (add.length) {
    await member.roles.add(add).catch(() => {});
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName("add")
    .setDescription("Admin leveling tools")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

    .addSubcommand(sub =>
      sub
        .setName("levels")
        .setDescription("Add levels to a user")
        .addUserOption(o =>
          o.setName("user")
            .setDescription("User to add levels to")
            .setRequired(true)
        )
        .addIntegerOption(o =>
          o.setName("amount")
            .setDescription("How many levels to add")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(1000)
        )
    ),

  async execute(interaction) {

    if (interaction.options.getSubcommand() !== "levels") return;

    const user = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");

    const doc = await Level.findOneAndUpdate(
      { guildId: interaction.guild.id, userId: user.id },
      { $inc: { level: amount } },
      { upsert: true, new: true }
    );

    // Apply roles if member exists in guild
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (member) await applyLevelRoles(member, doc.level);

    // Log
    const logChannel = interaction.client.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("📈 Levels Added")
        .addFields(
          { name: "User", value: `${user.tag} (${user.id})` },
          { name: "Amount", value: `${amount}`, inline: true },
          { name: "New Level", value: `${doc.level}`, inline: true },
          { name: "Moderator", value: `${interaction.user.tag} (${interaction.user.id})` }
        )
        .setTimestamp();

      logChannel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
    }

    return interaction.reply({
      content: `✅ Added **${amount}** levels to **${user.tag}**. New level: **${doc.level}**`,
      ephemeral: true
    });
  }
};
