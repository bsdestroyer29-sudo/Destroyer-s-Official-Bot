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

    console.log("📨 Invite Tracker Loaded.");

    // ========================================
    // CACHE INVITES ON START
    // ========================================
    for (const guild of client.guilds.cache.values()) {
      try {
        const invites = await guild.invites.fetch();

        for (const invite of invites.values()) {
          await Invite.findOneAndUpdate(
            { guildId: guild.id, code: invite.code },
            {
              guildId: guild.id,
              code: invite.code,
              inviterId: invite.inviter?.id || "Unknown",
              uses: invite.uses
            },
            { upsert: true }
          );
        }
      } catch {}
    }

    // ========================================
    // INVITE CREATE
    // ========================================
    client.on("inviteCreate", async invite => {
      await Invite.create({
        guildId: invite.guild.id,
        code: invite.code,
        inviterId: invite.inviter?.id || "Unknown",
        uses: invite.uses
      });
    });

    // ========================================
    // INVITE DELETE
    // ========================================
    client.on("inviteDelete", async invite => {
      await Invite.deleteOne({
        guildId: invite.guild.id,
        code: invite.code
      });
    });

    // ========================================
    // MEMBER JOIN → DETECT USED INVITE
    // ========================================
    client.on("guildMemberAdd", async member => {

      const guild = member.guild;
      const logChannel = getLogChannel(client);

      try {
        const newInvites = await guild.invites.fetch();
        const storedInvites = await Invite.find({ guildId: guild.id });

        let usedInvite = null;

        for (const invite of newInvites.values()) {
          const stored = storedInvites.find(i => i.code === invite.code);

          if (!stored) continue;

          if (invite.uses > stored.uses) {
            usedInvite = invite;
            break;
          }
        }

        if (!usedInvite) {
          if (logChannel) {
            logChannel.send(
              `➕ ${member.user.tag} joined (Invite not detected)`
            );
          }
          return;
        }

        // Update stored uses
        await Invite.findOneAndUpdate(
          { guildId: guild.id, code: usedInvite.code },
          { uses: usedInvite.uses }
        );

        const embed = new EmbedBuilder()
          .setColor("Green")
          .setTitle("🎉 New Member Joined")
          .addFields(
            { name: "User", value: `${member.user.tag}` },
            { name: "Invited By", value: `<@${usedInvite.inviter?.id}>` },
            { name: "Invite Code", value: usedInvite.code },
            { name: "Total Uses", value: usedInvite.uses.toString() }
          )
          .setThumbnail(member.user.displayAvatarURL())
          .setTimestamp();

        if (logChannel) {
          logChannel.send({ embeds: [embed] });
        }

      } catch (err) {
        console.error("Invite detection error:", err);
      }
    });

  }
};