import DMSession from "../models/DMSession.js";

export default {
  name: "messageCreate",
  once: false,

  async execute(message, client) {

    // ================= USER → STAFF =================
    if (!message.guild && !message.author.bot) {

      const session = await DMSession.findOne({
        userId: message.author.id,
        active: true
      });

      if (!session) return;

      const guild = client.guilds.cache.get(session.guildId);
      if (!guild) return;

      const staffMember = await guild.members.fetch(session.staffId).catch(() => null);
      if (!staffMember) return;

      // Forward to staff
      await staffMember.send(
        `📨 **Reply from ${message.author.tag}**\n\n${message.content}`
      );

      // Log
      const logChannel = guild.channels.cache.get(session.logChannelId);
      if (logChannel) {
        logChannel.send(
          `📥 **${message.author.tag} → Staff**\n${message.content}`
        );
      }

      return;
    }

    // ================= STAFF → USER =================
    if (message.guild && !message.author.bot) {

      // Only staff DMs (private messages)
      if (message.channel.type !== 1) return;

      const session = await DMSession.findOne({
        staffId: message.author.id,
        active: true
      });

      if (!session) return;

      const user = await client.users.fetch(session.userId).catch(() => null);
      if (!user) return;

      await user.send(message.content);

      const guild = client.guilds.cache.get(session.guildId);
      const logChannel = guild?.channels.cache.get(session.logChannelId);

      if (logChannel) {
        logChannel.send(
          `📤 **Staff → ${user.tag}**\n${message.content}`
        );
      }
    }
  }
};