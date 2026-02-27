import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} from "discord.js";

const STAFF_ROLE_IDS = [
  "1461793438084239492",
  "1475569615932227626",
  "1476271523831746580",
  "1476271529682534461",
  "1476271526767624223",
  "1476271511718596770",
  "1476929659709952060",
  "1476271532643979326",
  "1476271520090292270",
  "1471225745912103045",
  "1461793435236307260"
];

export default {
  data: new SlashCommandBuilder()
    .setName("staffperms")
    .setDescription("Grant all staff roles Send Messages permission in every text channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    // ✅ Reply immediately so Discord doesn't time out
    await interaction.reply({
      content: "⏳ Working on it... This may take a minute for large servers. I'll ping you when done.",
      ephemeral: true
    });

    const guild = interaction.guild;

    const textChannels = guild.channels.cache.filter(c =>
      c.type === ChannelType.GuildText ||
      c.type === ChannelType.GuildAnnouncement
    );

    if (!textChannels.size) {
      return interaction.editReply("❌ No text channels found.");
    }

    const validRoles = STAFF_ROLE_IDS.filter(id => guild.roles.cache.has(id));

    if (!validRoles.length) {
      return interaction.editReply("❌ None of the staff roles were found in this server.");
    }

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const [, channel] of textChannels) {
      for (const roleId of validRoles) {
        try {
          const existing = channel.permissionOverwrites.cache.get(roleId);

          if (existing?.allow.has(PermissionFlagsBits.SendMessages)) {
            skipped++;
            continue;
          }

          await channel.permissionOverwrites.edit(roleId, {
            SendMessages: true,
            ViewChannel: true
          });

          updated++;

          // ✅ Small delay to avoid Discord rate limits
          await new Promise(r => setTimeout(r, 100));

        } catch {
          failed++;
        }
      }
    }

    // ✅ Ping the user when done
    return interaction.editReply(
      [
        `✅ Done <@${interaction.user.id}>!`,
        `📝 Updated: **${updated}** permissions`,
        `⏭️ Skipped (already set): **${skipped}**`,
        `❌ Failed: **${failed}**`
      ].join("\n")
    );
  }
};
