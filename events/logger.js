// =================================================
// MEMBER UPDATE (ROLES / NICKNAME / TIMEOUT)
// =================================================
client.on("guildMemberUpdate", async (oldMember, newMember) => {

  const logChannel = getLogChannel(client);
  if (!logChannel) return;

  // ----------------------------
  // ROLE CHANGES
  // ----------------------------
  const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
  const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

  if (added.size || removed.size) {

    let executor = "Unknown";

    try {
      const logs = await newMember.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberRoleUpdate
      });

      const entry = logs.entries.first();
      if (entry && entry.target.id === newMember.id) {
        executor = `${entry.executor.tag} (${entry.executor.id})`;
      }

    } catch {}

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("🎭 Role Update")
      .setDescription(`Member: <@${newMember.id}>`)
      .addFields(
        {
          name: "➕ Added Roles",
          value: added.size
            ? added.map(r => `<@&${r.id}>`).join(", ")
            : "None",
        },
        {
          name: "➖ Removed Roles",
          value: removed.size
            ? removed.map(r => `<@&${r.id}>`).join(", ")
            : "None",
        },
        {
          name: "🛠 Updated By",
          value: executor,
        }
      )
      .setTimestamp();

    logChannel.send({ embeds: [embed] });
  }

  // ----------------------------
  // NICKNAME CHANGE
  // ----------------------------
  if (oldMember.nickname !== newMember.nickname) {
    logChannel.send(
      `📝 Nickname Changed: ${newMember.user.tag}\n` +
      `Before: ${oldMember.nickname || "None"}\n` +
      `After: ${newMember.nickname || "None"}`
    );
  }

  // ----------------------------
  // TIMEOUT CHANGE
  // ----------------------------
  if (oldMember.communicationDisabledUntil !== newMember.communicationDisabledUntil) {
    logChannel.send(
      `⏳ Timeout Updated: ${newMember.user.tag}\n` +
      `Until: ${newMember.communicationDisabledUntil || "Removed"}`
    );
  }

});