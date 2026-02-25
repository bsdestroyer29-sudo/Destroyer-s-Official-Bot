import Invite from "../models/Invite.js";

export default {
  name: "ready",
  once: false,

  async execute(client) {

    // =====================================
    // CACHE INVITES ON START
    // =====================================

    client.inviteCache = new Map();

    for (const guild of client.guilds.cache.values()) {
      const invites = await guild.invites.fetch();
      client.inviteCache.set(
        guild.id,
        new Map(invites.map(inv => [inv.code, inv.uses]))
      );
    }

    // =====================================
    // MEMBER JOIN
    // =====================================

    client.on("guildMemberAdd", async member => {

      const newInvites = await member.guild.invites.fetch();
      const oldInvites = client.inviteCache.get(member.guild.id);

      const usedInvite = newInvites.find(inv =>
        inv.uses > (oldInvites?.get(inv.code) || 0)
      );

      if (!usedInvite) return;

      let record = await Invite.findOne({
        guildId: member.guild.id,
        inviterId: usedInvite.inviter.id
      });

      if (!record) {
        record = await Invite.create({
          guildId: member.guild.id,
          inviterId: usedInvite.inviter.id,
          invites: 0,
          fakeInvites: 0,
          leaves: 0,
          invitedUsers: []
        });
      }

      record.invites += 1;
      record.invitedUsers.push(member.id);

      await record.save();

      // Update cache
      client.inviteCache.set(
        member.guild.id,
        new Map(newInvites.map(inv => [inv.code, inv.uses]))
      );
    });

    // =====================================
    // MEMBER LEAVE (FIXED)
    // =====================================

    client.on("guildMemberRemove", async member => {

      try {

        // Check kick
        const kickLogs = await member.guild.fetchAuditLogs({
          limit: 1,
          type: 20 // MEMBER_KICK
        });

        const kickEntry = kickLogs.entries.first();

        if (
          kickEntry &&
          kickEntry.target.id === member.id &&
          Date.now() - kickEntry.createdTimestamp < 5000
        ) {
          return; // Ignore kicks
        }

        // Check ban
        const banLogs = await member.guild.fetchAuditLogs({
          limit: 1,
          type: 22 // MEMBER_BAN_ADD
        });

        const banEntry = banLogs.entries.first();

        if (
          banEntry &&
          banEntry.target.id === member.id &&
          Date.now() - banEntry.createdTimestamp < 5000
        ) {
          return; // Ignore bans
        }

        // If not kicked or banned → normal leave

        const record = await Invite.findOne({
          guildId: member.guild.id,
          invitedUsers: member.id
        });

        if (!record) return;

        record.invites -= 1;
        record.fakeInvites += 1;
        record.invitedUsers = record.invitedUsers.filter(
          id => id !== member.id
        );

        await record.save();

      } catch (err) {
        console.error(err);
      }
    });

    // =====================================
    // INVITE CREATE / DELETE
    // =====================================

    client.on("inviteCreate", invite => {
      const guildInvites = client.inviteCache.get(invite.guild.id) || new Map();
      guildInvites.set(invite.code, invite.uses);
      client.inviteCache.set(invite.guild.id, guildInvites);
    });

    client.on("inviteDelete", invite => {
      const guildInvites = client.inviteCache.get(invite.guild.id);
      if (guildInvites) {
        guildInvites.delete(invite.code);
        client.inviteCache.set(invite.guild.id, guildInvites);
      }
    });

  }
};