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
    // SLASH COMMAND LOG
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
    // MESSAGE EDIT
    // =================================================
    client.on("messageUpdate", async (oldMsg, newMsg) => {
      if (!oldMsg.guild || oldMsg.author?.bot) return;
      if (oldMsg.content === newMsg.content) return;

      const logChannel = getLogChannel(client);
      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setColor("Orange")
        .setTitle("✏️ Message Edited")
        .addFields(
          { name: "User", value: `${oldMsg.author.tag}` },
          { name: "Channel", value: `<#${oldMsg.channel.id}>` },
          { name: "Before", value: oldMsg.content || "None" },
          { name: "After", value: newMsg.content || "None" }
        )
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    });

    // =================================================
    // MESSAGE DELETE (WITH EXECUTOR)
    // =================================================
    client.on("messageDelete", async message => {
      if (!message.guild || message.author?.bot) return;

      const logChannel = getLogChannel(client);
      if (!logChannel) return;

      let executor = "Unknown";

      try {
        const logs = await message.guild.fetchAuditLogs({
          limit: 1,
          type: AuditLogEvent.MessageDelete
        });

        const entry = logs.entries.first();
        if (entry && entry.target.id === message.author.id) {
          executor = entry.executor.tag;
        }
      } catch {}

      const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("🗑 Message Deleted")
        .addFields(
          { name: "Author", value: `${message.author.tag}` },
          { name: "Deleted By", value: executor },
          { name: "Channel", value: `<#${message.channel.id}>` },
          { name: "Content", value: message.content || "None" }
        )
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    });

    // =================================================
    // ROLE / NICKNAME / TIMEOUT UPDATE
    // =================================================
    client.on("guildMemberUpdate", async (oldMember, newMember) => {
      const logChannel = getLogChannel(client);
      if (!logChannel) return;

      // ROLE CHANGES
      const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
      const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

      if (added.size || removed.size) {
        let executor = "Unknown";

        try {
          const logs = await newMember.guild.fetchAuditLogs({
            limit: 1,
            type: AuditLogEvent.MemberRoleUpdate
          });
          executor = logs.entries.first()?.executor?.tag || "Unknown";
        } catch {}

        const embed = new EmbedBuilder()
          .setColor("Purple")
          .setTitle("🎭 Role Update")
          .addFields(
            { name: "User", value: newMember.user.tag },
            { name: "Added", value: added.map(r => r.name).join(", ") || "None" },
            { name: "Removed", value: removed.map(r => r.name).join(", ") || "None" },
            { name: "Changed By", value: executor }
          )
          .setTimestamp();

        logChannel.send({ embeds: [embed] });
      }

      // NICKNAME CHANGE
      if (oldMember.nickname !== newMember.nickname) {
        const embed = new EmbedBuilder()
          .setColor("Yellow")
          .setTitle("📝 Nickname Changed")
          .addFields(
            { name: "User", value: newMember.user.tag },
            { name: "Before", value: oldMember.nickname || "None" },
            { name: "After", value: newMember.nickname || "None" }
          )
          .setTimestamp();

        logChannel.send({ embeds: [embed] });
      }

      // TIMEOUT CHANGE
      if (oldMember.communicationDisabledUntil !== newMember.communicationDisabledUntil) {
        const embed = new EmbedBuilder()
          .setColor("DarkOrange")
          .setTitle("⏳ Timeout Updated")
          .addFields(
            { name: "User", value: newMember.user.tag },
            { name: "Until", value: newMember.communicationDisabledUntil?.toString() || "Removed" }
          )
          .setTimestamp();

        logChannel.send({ embeds: [embed] });
      }
    });

    // =================================================
    // MEMBER JOIN
    // =================================================
    client.on("guildMemberAdd", member => {
      const logChannel = getLogChannel(client);
      if (!logChannel) return;

      logChannel.send(`➕ Member Joined: ${member.user.tag}`);
    });

    // =================================================
    // MEMBER LEAVE / KICK
    // =================================================
    client.on("guildMemberRemove", async member => {
      const logChannel = getLogChannel(client);
      if (!logChannel) return;

      try {
        const logs = await member.guild.fetchAuditLogs({
          limit: 1,
          type: AuditLogEvent.MemberKick
        });

        const entry = logs.entries.first();

        if (entry && entry.target.id === member.id) {
          return logChannel.send(`👢 ${member.user.tag} was kicked by ${entry.executor.tag}`);
        }
      } catch {}

      logChannel.send(`➖ Member Left: ${member.user.tag}`);
    });

    // =================================================
    // MEMBER BAN
    // =================================================
    client.on("guildBanAdd", async ban => {
      const logChannel = getLogChannel(client);
      if (!logChannel) return;

      let executor = "Unknown";

      try {
        const logs = await ban.guild.fetchAuditLogs({
          limit: 1,
          type: AuditLogEvent.MemberBanAdd
        });
        executor = logs.entries.first()?.executor?.tag || "Unknown";
      } catch {}

      logChannel.send(`🔨 ${ban.user.tag} was banned by ${executor}`);
    });

    // =================================================
    // CHANNEL CREATE / DELETE
    // =================================================
    client.on("channelCreate", channel => {
      const logChannel = getLogChannel(client);
      if (!logChannel) return;

      logChannel.send(`📁 Channel Created: ${channel.name}`);
    });

    client.on("channelDelete", channel => {
      const logChannel = getLogChannel(client);
      if (!logChannel) return;

      logChannel.send(`🗑 Channel Deleted: ${channel.name}`);
    });

  }
};