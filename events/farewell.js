import { EmbedBuilder } from "discord.js";

const FAREWELL_CHANNEL_ID = "1477054520570937488";

export default {
  name: "guildMemberRemove",
  once: false,

  async execute(member, client) {
    const channel = member.guild.channels.cache.get(FAREWELL_CHANNEL_ID);
    if (!channel) return;

    // How long they were in the server
    const joinedAt = member.joinedAt;
    const now = new Date();
    const diffMs = now - joinedAt;

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let duration = "";
    if (days > 0) duration += `${days} day${days !== 1 ? "s" : ""} `;
    if (hours > 0) duration += `${hours} hour${hours !== 1 ? "s" : ""} `;
    if (minutes > 0 && days === 0) duration += `${minutes} minute${minutes !== 1 ? "s" : ""}`;
    if (!duration) duration = "just now";

    const memberCount = member.guild.memberCount;

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle("👋 Goodbye!")
      .setDescription(
        `👤 **${member.user.tag}** has left the server.\n` +
        `We'll miss you! 💔`
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        {
          name: "⏱️ Time With Us",
          value: `**${duration.trim()}**`,
          inline: true
        },
        {
          name: "👥 Member Count",
          value: `**${memberCount}**`,
          inline: true
        },
        {
          name: "📅 Joined At",
          value: joinedAt ? `<t:${Math.floor(joinedAt.getTime() / 1000)}:F>` : "Unknown",
          inline: false
        }
      )
      .setFooter({ text: `ID: ${member.user.id}` })
      .setTimestamp();

    await channel.send({
      content: `👋 **${member.user.tag}** just left us.`,
      embeds: [embed]
    }).catch(() => {});
  }
};
