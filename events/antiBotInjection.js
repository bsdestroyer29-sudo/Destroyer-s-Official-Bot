import { AuditLogEvent, EmbedBuilder } from "discord.js";

const OWNER_ID = "1457713586137727102";
const LOG_CHANNEL_ID = "1475508584744747162";

export default {
  name: "guildMemberAdd",
  once: false,

  async execute(member, client) {

    if (!member.user.bot) return;

    // Wait small delay for audit log to register
    await new Promise(res => setTimeout(res, 1000));

    const guild = member.guild;

    const logs = await guild.fetchAuditLogs({
      limit: 1,
      type: AuditLogEvent.BotAdd
    }).catch(() => null);

    if (!logs) return;

    const entry = logs.entries.first();
    if (!entry) return;

    const executor = entry.executor;

    if (!executor) return;

    const botHasAdmin =
      member.permissions.has("Administrator");

    // If owner added it → allow
    if (executor.id === OWNER_ID) return;

    // If bot doesn't have admin → allow
    if (!botHasAdmin) return;

    // 🚨 Unauthorized admin bot detected
    await member.kick("Unauthorized admin bot detected").catch(() => {});

    const logChannel = client.channels.cache.get(LOG_CHANNEL_ID);

    if (logChannel) {
      const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("🚨 Unauthorized Admin Bot Removed")
        .addFields(
          { name: "Bot", value: `${member.user.tag} (${member.id})` },
          { name: "Added By", value: `${executor.tag} (${executor.id})` }
        )
        .setTimestamp();

      logChannel.send({ embeds: [embed] });
    }
  }
};