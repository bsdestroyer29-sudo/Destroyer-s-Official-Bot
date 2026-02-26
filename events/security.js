import { AuditLogEvent, PermissionsBitField } from "discord.js";

/* ================= STORAGE ================= */

const joinCache = new Map();
const deleteCache = new Map();

/* ================= CONFIG ================= */

const CONFIG = {
  joinThreshold: 6,        // joins in window
  joinWindow: 10000,       // 10 seconds
  minAccountAgeDays: 3,

  deleteThreshold: 3,      // deletions in window
  deleteWindow: 5000,      // 5 seconds
};

/* ================= HELPERS ================= */

function recordDelete(guildId) {
  const now = Date.now();

  if (!deleteCache.has(guildId)) deleteCache.set(guildId, []);
  const arr = deleteCache.get(guildId);

  arr.push(now);
  const recent = arr.filter(t => now - t < CONFIG.deleteWindow);
  deleteCache.set(guildId, recent);

  return recent.length;
}

/* ================= EXPORT ================= */

export default {
  name: "ready",
  once: true,
  async execute(client) {

    console.log("🛡️ Destroyer Security (Strict + No Lockdown) Loaded.");

    /* ============================================
       OWNER-ONLY ADMIN BOT SHIELD
    ============================================ */
    client.on("guildMemberAdd", async (member) => {
      if (!member.user.bot) return;

      const guild = member.guild;

      const dangerousPerms = [
        PermissionsBitField.Flags.Administrator,
        PermissionsBitField.Flags.ManageGuild,
        PermissionsBitField.Flags.ManageRoles,
        PermissionsBitField.Flags.ManageChannels,
        PermissionsBitField.Flags.BanMembers,
        PermissionsBitField.Flags.KickMembers,
        PermissionsBitField.Flags.ManageWebhooks,
      ];

      const botDangerous = member.roles.cache.some(role =>
        dangerousPerms.some(p => role.permissions.has(p))
      );

      if (!botDangerous) return;

      let inviter = null;

      try {
        const logs = await guild.fetchAuditLogs({
          limit: 1,
          type: AuditLogEvent.BotAdd,
        });

        inviter = logs.entries.first()?.executor ?? null;
      } catch {}

      // Only owner allowed to add admin bots
      if (!inviter || inviter.id !== guild.ownerId) {
        try {
          await member.kick("Destroyer Security: Only owner can add admin bots");
          console.log(`🚫 Removed dangerous bot: ${member.user.tag}`);
        } catch {}
      }
    });

    /* ============================================
       JOIN RAID PROTECTION
    ============================================ */
    client.on("guildMemberAdd", async (member) => {
      if (member.user.bot) return;

      const guild = member.guild;
      const now = Date.now();

      // Too new account
      const ageDays =
        (now - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);

      if (ageDays < CONFIG.minAccountAgeDays) {
        try {
          await member.kick("Destroyer Security: Account too new");
        } catch {}
        return;
      }

      if (!joinCache.has(guild.id)) joinCache.set(guild.id, []);
      const arr = joinCache.get(guild.id);

      arr.push(now);
      const recent = arr.filter(t => now - t < CONFIG.joinWindow);
      joinCache.set(guild.id, recent);

      if (recent.length >= CONFIG.joinThreshold) {
        console.log(`⚠️ Join raid detected in ${guild.name}`);

        // Kick newest joins (simple mitigation)
        for (const m of guild.members.cache
          .filter(m => !m.user.bot)
          .sort((a, b) => b.joinedTimestamp - a.joinedTimestamp)
          .first(CONFIG.joinThreshold)) {

          try {
            await m.kick("Destroyer Security: Join raid detected");
          } catch {}
        }
      }
    });

    /* ============================================
       ANTI CHANNEL DELETE SPAM
    ============================================ */
    client.on("channelDelete", async (channel) => {
      const guild = channel.guild;

      let executor = null;
      try {
        const logs = await guild.fetchAuditLogs({
          limit: 1,
          type: AuditLogEvent.ChannelDelete,
        });

        executor = logs.entries.first()?.executor ?? null;
      } catch {}

      if (!executor || executor.id === guild.ownerId) return;

      const count = recordDelete(guild.id);

      if (count >= CONFIG.deleteThreshold) {
        console.log(`⚠️ Channel delete spike detected`);

        try {
          await guild.members.ban(executor.id, {
            reason: "Destroyer Security: Mass channel delete"
          });
        } catch {}
      }
    });

    /* ============================================
       ANTI ROLE DELETE SPAM
    ============================================ */
    client.on("roleDelete", async (role) => {
      const guild = role.guild;

      let executor = null;
      try {
        const logs = await guild.fetchAuditLogs({
          limit: 1,
          type: AuditLogEvent.RoleDelete,
        });

        executor = logs.entries.first()?.executor ?? null;
      } catch {}

      if (!executor || executor.id === guild.ownerId) return;

      const count = recordDelete(guild.id);

      if (count >= CONFIG.deleteThreshold) {
        console.log(`⚠️ Role delete spike detected`);

        try {
          await guild.members.ban(executor.id, {
            reason: "Destroyer Security: Mass role delete"
          });
        } catch {}
      }
    });

  }
};