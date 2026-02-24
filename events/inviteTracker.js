import Invite from "../models/Invite.js";
import { EmbedBuilder } from "discord.js";

const LOG_CHANNEL_ID = "1475508584744747162";

function getLogChannel(client) {
  return client.channels.cache.get(LOG_CHANNEL_ID);
}

export default {
  name: "ready",
  once: false,

  async execute(client) {

    console.log("📨 Advanced Invite Tracker Loaded.");

    const inviteCache = new Map();

    // ================= CACHE ON READY =================
    for (const guild of client.guilds.cache.values()) {
      const invites = await guild.invites.fetch().catch(() => null);
      if (!invites) continue;

      inviteCache.set(guild.id, new Map(
        invites.map(inv => [inv.code, inv.uses])
      ));
    }

    // ================= INVITE CREATE =================
    client.on("inviteCreate", invite => {
      const guildInvites = inviteCache.get(invite.guild.id);
      if (guildInvites)
        guildInvites.set(invite.code, invite.uses);
    });

    // ================= MEMBER JOIN =================
    client.on("guildMemberAdd", async member => {

      const guild = member.guild;
      const newInvites = await guild.invites.fetch().catch(() => null);
      if (!newInvites) return;

      const oldInvites = inviteCache.get(guild.id);
      inviteCache.set(guild.id, new Map(
        newInvites.map(inv => [inv.code, inv.uses])
      ));

      let usedInvite;

      for (const invite of newInvites.values()) {
        const previousUses = oldInvites?.get(invite.code) || 0;
        if (invite.uses > previousUses) {
          usedInvite = invite;
          break;
        }
      }

      const logChannel = getLogChannel(client);

      if (!usedInvite) {
        if (logChannel)
          logChannel.send(`➕ ${member.user.tag} joined (Unknown invite)`);
        return;
      }

      // 🚫 Anti self invite
      if (usedInvite.inviter?.id === member.id) {
        if (logChannel)
          logChannel.send(`🚫 ${member.user.tag} tried self-invite.`);
        return;
      }

      const inviterId = usedInvite.inviter?.id;
      if (!inviterId) return;

      const data = await Invite.findOneAndUpdate(
        { guildId: guild.id, inviterId },
        { $inc: { invites: 1 }, $push: { invitedUsers: member.id } },
        { upsert: true, new: true }
      );

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("🎉 New Invite")
        .addFields(
          { name: "User", value: member.user.tag },
          { name: "Invited By", value: `<@${inviterId}>` },
          { name: "Total Invites", value: data.invites.toString() }
        )
        .setTimestamp();

      if (logChannel)
        logChannel.send({ embeds: [embed] });
    });

    // ================= FAKE INVITE DETECTION =================
    client.on("guildMemberRemove", async member => {

      const data = await Invite.findOne({
        guildId: member.guild.id,
        invitedUsers: member.id
      });

      if (!data) return;

      data.invites -= 1;
      data.leaves += 1;
      data.fakeInvites += 1;

      data.invitedUsers = data.invitedUsers.filter(id => id !== member.id);

      await data.save();

      const logChannel = getLogChannel(client);
      if (logChannel) {
        logChannel.send(
          `⚠️ Fake Invite Detected\nUser: ${member.user.tag}\nInviter: <@${data.inviterId}>`
        );
      }
    });

  }
};