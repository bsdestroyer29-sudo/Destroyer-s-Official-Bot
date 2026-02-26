import {
  EmbedBuilder,
  AuditLogEvent,
  Events
} from "discord.js";

import DMSession from "../models/DMSession.js";

const LOG_CHANNEL_ID = "1475508584744747162";

function getLogChannel(client) {
  return client.channels.cache.get(LOG_CHANNEL_ID);
}

function truncate(text, max = 1000) {
  if (!text) return "None";
  return text.length > max ? text.slice(0, max) + "..." : text;
}

export default {
  name: Events.ClientReady,
  once: false,

  execute(client) {

    console.log("📝 Advanced Logger Loaded.");

    // =================================================
    // SLASH COMMAND LOG
    // =================================================
    client.on("interactionCreate", async interaction => {
      if (!interaction.isChatInputCommand()) return;

      const logChannel = getLogChannel(client);
      if (!logChannel) return;

      const options = interaction.options.data
        .map(opt => `${opt.name}: ${opt.value ?? opt.type}`)
        .join("\n") || "None";

      const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle("📌 Slash Command Used")
        .addFields(
          { name: "User", value: `${interaction.user.tag} (${interaction.user.id})` },
          { name: "Command", value: `/${interaction.commandName}` },
          { name: "Channel", value: `<#${interaction.channelId}>` },
          { name: "Options", value: truncate(options, 500) }
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
          { name: "User", value: oldMsg.author.tag },
          { name: "Channel", value: `<#${oldMsg.channel.id}>` },
          { name: "Before", value: truncate(oldMsg.content) },
          { name: "After", value: truncate(newMsg.content) },
          { name: "Jump", value: `[Go to Message](${newMsg.url})` }
        )
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    });

    // =================================================
    // MESSAGE DELETE
    // =================================================
    client.on("messageDelete", async message => {
      if (!message.guild || message.author?.bot) return;

      const logChannel = getLogChannel(client);
      if (!logChannel) return;

      let executor = "Unknown";

      try {
        const logs = await message.guild.fetchAuditLogs({
          limit: 5,
          type: AuditLogEvent.MessageDelete
        });

        const entry = logs.entries.find(
          e => e.target.id === message.author.id &&
               Date.now() - e.createdTimestamp < 5000
        );

        if (entry) executor = entry.executor.tag;
      } catch {}

      const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("🗑 Message Deleted")
        .addFields(
          { name: "Author", value: message.author.tag },
          { name: "Deleted By", value: executor },
          { name: "Channel", value: `<#${message.channel.id}>` },
          { name: "Content", value: truncate(message.content) }
        )
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    });

    // =================================================
    // MEMBER JOIN
    // =================================================
    client.on("guildMemberAdd", member => {
      const logChannel = getLogChannel(client);
      if (!logChannel) return;

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("➕ Member Joined")
        .setThumbnail(member.user.displayAvatarURL())
        .addFields(
          { name: "User", value: `${member.user.tag}` },
          {
            name: "Account Age",
            value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`
          }
        )
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    });

    // =================================================
    // LEAVE vs KICK
    // =================================================
    client.on("guildMemberRemove", async member => {
      const logChannel = getLogChannel(client);
      if (!logChannel) return;

      try {
        const logs = await member.guild.fetchAuditLogs({
          limit: 5,
          type: AuditLogEvent.MemberKick
        });

        const entry = logs.entries.find(
          e => e.target.id === member.id &&
               Date.now() - e.createdTimestamp < 5000
        );

        if (entry) {
          return logChannel.send(
            `👢 ${member.user.tag} was kicked by ${entry.executor.tag}`
          );
        }
      } catch {}

      logChannel.send(`➖ ${member.user.tag} left the server.`);
    });

    // =================================================
    // BAN
    // =================================================
    client.on("guildBanAdd", async ban => {
      const logChannel = getLogChannel(client);
      if (!logChannel) return;

      let executor = "Unknown";
      let reason = "No reason";

      try {
        const logs = await ban.guild.fetchAuditLogs({
          limit: 5,
          type: AuditLogEvent.MemberBanAdd
        });

        const entry = logs.entries.find(
          e => e.target.id === ban.user.id &&
               Date.now() - e.createdTimestamp < 5000
        );

        if (entry) {
          executor = entry.executor.tag;
          reason = entry.reason || "No reason";
        }
      } catch {}

      logChannel.send(
        `🔨 ${ban.user.tag} was banned by ${executor}\nReason: ${reason}`
      );
    });

// =================================================
// ROLE CHANGES (EMBED VERSION)
// =================================================
client.on("guildMemberUpdate", async (oldMember, newMember) => {

  const logChannel = client.channels.cache.get("1475508584744747162");
  if (!logChannel) return;

  const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
  const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

  if (!added.size && !removed.size) return;

  let executor = "Unknown";

  try {
    const logs = await newMember.guild.fetchAuditLogs({
      limit: 1,
      type: 25 // MemberRoleUpdate
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
        inline: false
      },
      {
        name: "➖ Removed Roles",
        value: removed.size
          ? removed.map(r => `<@&${r.id}>`).join(", ")
          : "None",
        inline: false
      },
      {
        name: "🛠 Updated By",
        value: executor,
        inline: false
      }
    )
    .setTimestamp();

  logChannel.send({ embeds: [embed] });

});

      if (oldMember.nickname !== newMember.nickname) {
        logChannel.send(
          `📝 Nickname Changed: ${newMember.user.tag}\n` +
          `Before: ${oldMember.nickname || "None"}\n` +
          `After: ${newMember.nickname || "None"}`
        );
      }

      if (oldMember.communicationDisabledUntil !== newMember.communicationDisabledUntil) {
        logChannel.send(
          `⏳ Timeout Updated: ${newMember.user.tag}\n` +
          `Until: ${newMember.communicationDisabledUntil || "Removed"}`
        );
      }
    });

    // =================================================
    // VOICE STATE
    // =================================================
    client.on("voiceStateUpdate", (oldState, newState) => {
      const logChannel = getLogChannel(client);
      if (!logChannel) return;

      if (!oldState.channel && newState.channel) {
        logChannel.send(`🔊 ${newState.member.user.tag} joined ${newState.channel.name}`);
      } else if (oldState.channel && !newState.channel) {
        logChannel.send(`🔇 ${oldState.member.user.tag} left ${oldState.channel.name}`);
      } else if (oldState.channelId !== newState.channelId) {
        logChannel.send(
          `🔁 ${newState.member.user.tag} moved from ${oldState.channel?.name} to ${newState.channel?.name}`
        );
      }
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