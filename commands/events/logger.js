import { EmbedBuilder, AuditLogEvent } from "discord.js";

const LOG_CHANNEL_ID = "1475508584744747162";

function getLogChannel(client) {
  return client.channels.cache.get(LOG_CHANNEL_ID);
}

export default {
  name: "ready",
  once: false,
  execute(client) {

    // =================================================
    // COMMAND LOGGING
    // =================================================
    client.on("interactionCreate", async interaction => {
      if (!interaction.isChatInputCommand()) return;

      const logChannel = getLogChannel(client);
      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle("📌 Command Used")
        .addFields(
          { name: "User", value: `${interaction.user.tag} (${interaction.user.id})` },
          { name: "Command", value: `/${interaction.commandName}` },
          { name: "Channel", value: `<#${interaction.channelId}>` }
        )
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    });

    // =================================================
    // MESSAGE DELETE (WHO DELETED)
    // =================================================
    client.on("messageDelete", async message => {
      if (!message.guild || message.author?.bot) return;

      const logChannel = getLogChannel(client);
      if (!logChannel) return;

      const fetchedLogs = await message.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MessageDelete
      });

      const deletionLog = fetchedLogs.entries.first();
      const executor = deletionLog?.executor;

      const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("🗑 Message Deleted")
        .addFields(
          { name: "Author", value: `${message.author?.tag}` },
          { name: "Deleted By", value: executor ? `${executor.tag}` : "Unknown" },
          { name: "Content", value: message.content || "None" }
        )
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    });

    // =================================================
    // ROLE ADD / REMOVE (WHO DID IT)
    // =================================================
    client.on("guildMemberUpdate", async (oldMember, newMember) => {
      const logChannel = getLogChannel(client);
      if (!logChannel) return;

      const fetchedLogs = await newMember.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberRoleUpdate
      });

      const roleLog = fetchedLogs.entries.first();
      const executor = roleLog?.executor;

      const oldRoles = oldMember.roles.cache;
      const newRoles = newMember.roles.cache;

      const added = newRoles.filter(r => !oldRoles.has(r.id));
      const removed = oldRoles.filter(r => !newRoles.has(r.id));

      if (!added.size && !removed.size) return;

      const embed = new EmbedBuilder()
        .setColor("Purple")
        .setTitle("🎭 Role Update")
        .addFields(
          { name: "User", value: `${newMember.user.tag}` },
          { name: "Added", value: added.map(r => r.name).join(", ") || "None" },
          { name: "Removed", value: removed.map(r => r.name).join(", ") || "None" },
          { name: "Changed By", value: executor ? executor.tag : "Unknown" }
        )
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    });

    // =================================================
    // MEMBER KICK
    // =================================================
    client.on("guildMemberRemove", async member => {
      const logChannel = getLogChannel(client);
      if (!logChannel) return;

      const fetchedLogs = await member.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberKick
      });

      const kickLog = fetchedLogs.entries.first();

      if (kickLog && kickLog.target.id === member.id) {
        const embed = new EmbedBuilder()
          .setColor("DarkRed")
          .setTitle("👢 Member Kicked")
          .addFields(
            { name: "User", value: member.user.tag },
            { name: "Kicked By", value: kickLog.executor.tag }
          )
          .setTimestamp();

        return logChannel.send({ embeds: [embed] });
      }

      // If not kick → normal leave
      logChannel.send(`➖ Member Left: ${member.user.tag}`);
    });

    // =================================================
    // MEMBER BAN
    // =================================================
    client.on("guildBanAdd", async ban => {
      const logChannel = getLogChannel(client);
      if (!logChannel) return;

      const fetchedLogs = await ban.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberBanAdd
      });

      const banLog = fetchedLogs.entries.first();

      const embed = new EmbedBuilder()
        .setColor("Black")
        .setTitle("🔨 Member Banned")
        .addFields(
          { name: "User", value: ban.user.tag },
          { name: "Banned By", value: banLog?.executor?.tag || "Unknown" }
        )
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    });

    // =================================================
    // CHANNEL CREATE
    // =================================================
    client.on("channelCreate", async channel => {
      const logChannel = getLogChannel(client);
      if (!logChannel) return;

      const fetchedLogs = await channel.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ChannelCreate
      });

      const createLog = fetchedLogs.entries.first();

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("📁 Channel Created")
        .addFields(
          { name: "Channel", value: channel.name },
          { name: "Created By", value: createLog?.executor?.tag || "Unknown" }
        )
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    });

    // =================================================
    // CHANNEL DELETE
    // =================================================
    client.on("channelDelete", async channel => {
      const logChannel = getLogChannel(client);
      if (!logChannel) return;

      const fetchedLogs = await channel.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ChannelDelete
      });

      const deleteLog = fetchedLogs.entries.first();

      const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("🗑 Channel Deleted")
        .addFields(
          { name: "Channel", value: channel.name },
          { name: "Deleted By", value: deleteLog?.executor?.tag || "Unknown" }
        )
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    });

  }
};