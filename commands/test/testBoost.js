import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} from "discord.js";

const BOOST_CHANNEL_ID = "1475950368071487659";

export default {
  data: new SlashCommandBuilder()
    .setName("test")
    .setDescription("Test commands")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

    .addSubcommand(sub =>
      sub
        .setName("boost")
        .setDescription("Test boost announcement")
        .addUserOption(o =>
          o.setName("user")
            .setDescription("User to simulate boost")
            .setRequired(true)
        )
    ),

  async execute(interaction) {

    if (interaction.options.getSubcommand() !== "boost") return;

    const user = interaction.options.getUser("user");

    const channel = interaction.client.channels.cache.get(BOOST_CHANNEL_ID);
    if (!channel)
      return interaction.reply({
        content: "❌ Boost channel not found.",
        ephemeral: true
      });

    const boostCount = interaction.guild.premiumSubscriptionCount;
    const boostLevel = interaction.guild.premiumTier;

    const embed = new EmbedBuilder()
      .setColor("Purple")
      .setTitle("🚀 Server Boosted! (TEST)")
      .setDescription(
        `💜 <@${user.id}> just boosted the server!\n\n` +
        `🔥 Total Boosts: **${boostCount}**\n` +
        `⭐ Boost Level: **${boostLevel}**`
      )
      .setThumbnail(user.displayAvatarURL())
      .setTimestamp();

    await channel.send({ embeds: [embed] });

    return interaction.reply({
      content: "✅ Test boost sent.",
      ephemeral: true
    });
  }
};