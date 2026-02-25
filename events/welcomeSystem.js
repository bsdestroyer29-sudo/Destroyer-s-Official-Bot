import { EmbedBuilder } from "discord.js";

const WELCOME_CHANNEL_ID = "1461714906297405586";
const NEWBIE_ROLE_ID = "1461791416706404575";

export default {
  name: "guildMemberAdd",
  once: false,

  async execute(member, client) {

    const channel = client.channels.cache.get(WELCOME_CHANNEL_ID);
    if (!channel) return;

    // Give Newbie role
    if (NEWBIE_ROLE_ID) {
      member.roles.add(NEWBIE_ROLE_ID).catch(() => {});
    }

    // Detect inviter using invite tracker cache
    let inviterText = "Unknown";

    try {
      const newInvites = await member.guild.invites.fetch();
      const inviteData = client.inviteCache?.get(member.guild.id);

      if (inviteData) {
        const usedInvite = newInvites.find(inv =>
          inv.uses > (inviteData.get(inv.code) || 0)
        );

        if (usedInvite) {
          inviterText = `<@${usedInvite.inviter.id}>`;
        }

        // Update cache
        client.inviteCache.set(
          member.guild.id,
          new Map(newInvites.map(inv => [inv.code, inv.uses]))
        );
      }
    } catch {}

    // Account age
    const accountAgeDays = Math.floor(
      (Date.now() - member.user.createdTimestamp) / 86400000
    );

    const embed = new EmbedBuilder()
      .setColor("Green")
      .setTitle("🎉 Welcome to the Server!")
      .setDescription(
        `👋 Welcome <@${member.id}>!\n\n` +
        `🎭 Role: **Newbie Assigned**\n` +
        `📊 Invited By: ${inviterText}\n` +
        `📅 Account Age: **${accountAgeDays} days**\n` +
        `👥 Member Count: **${member.guild.memberCount}**`
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    channel.send({
      content: `<@${member.id}>`,
      embeds: [embed]
    });
  }
};