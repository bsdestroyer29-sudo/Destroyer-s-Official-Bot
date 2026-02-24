import { EmbedBuilder } from "discord.js";

const BOOST_CHANNEL_ID = "1475950368071487659";

export default {
  name: "guildMemberUpdate",
  once: false,

  async execute(oldMember, newMember, client) {

    // New boost
    if (!oldMember.premiumSince && newMember.premiumSince) {

      const channel = client.channels.cache.get(BOOST_CHANNEL_ID);
      if (!channel) return;

      const boostCount = newMember.guild.premiumSubscriptionCount;
      const boostLevel = newMember.guild.premiumTier;

      const embed = new EmbedBuilder()
        .setColor("Purple")
        .setTitle("🚀 Server Boosted!")
        .setDescription(
          `💜 <@${newMember.id}> just boosted the server!\n\n` +
          `🔥 Total Boosts: **${boostCount}**\n` +
          `⭐ Boost Level: **${boostLevel}**`
        )
        .setThumbnail(newMember.user.displayAvatarURL())
        .setTimestamp();

      channel.send({ embeds: [embed] });
    }

    // Boost ended
    if (oldMember.premiumSince && !newMember.premiumSince) {

      const channel = client.channels.cache.get(BOOST_CHANNEL_ID);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("💔 Boost Ended")
        .setDescription(
          `<@${newMember.id}> stopped boosting the server.`
        )
        .setTimestamp();

      channel.send({ embeds: [embed] });
    }
  }
};