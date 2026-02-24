import DMSession from "../models/DMSession.js";

export default {
  name: "messageCreate",
  once: false,

  async execute(message, client) {

    // Only handle DMs
    if (message.guild) return;
    if (message.author.bot) return;

    const session = await DMSession.findOne({
      userId: message.author.id
    });

    if (!session) return;

    const guild = client.guilds.cache.get(session.guildId);
    if (!guild) return;

    const staffMember = await guild.members.fetch(session.staffId).catch(() => null);
    if (!staffMember) return;

    try {
      await staffMember.send(
        `📨 **Reply from ${message.author.tag}**\n\n${message.content}`
      );
    } catch {}

  }
};