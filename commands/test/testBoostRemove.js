import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} from "discord.js";

const BOOST_CHANNEL_ID = "1475950368071487659";

export default {
  data: new SlashCommandBuilder()
    .setName("testboostremove")
    .setDescription("Simulate boost removal")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option =>
      option
        .setName("user")
        .setDescription("User to simulate boost removal")
        .setRequired(true)
    ),

  async execute(interaction) {

    const user = interaction.options.getUser("user");

    const channel = interaction.client.channels.cache.get(BOOST_CHANNEL_ID);
    if (!channel) {
      return interaction.reply({
        content: "❌ Boost channel not found.",
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle("💔 Boost Ended (TEST)")
      .setDescription(
        `<@${user.id}> stopped boosting the server.`
      )
      .setThumbnail(user.displayAvatarURL())
      .setTimestamp();

    await channel.send({ embeds: [embed] });

    return interaction.reply({
      content: "✅ Test boost removal sent.",
      ephemeral: true
    });
  }
};