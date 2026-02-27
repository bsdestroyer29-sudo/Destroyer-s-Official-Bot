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
    await interaction.reply({
      content: "⏳ Working on it... I'll ping you when done.",
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
      try {
        // ✅ Build all overwrites for this channel in one go
        const overwrites = [...channel.permissionOverwrites.cache.values()];

        let channelNeedsUpdate = false;

        for (const roleId of validRoles) {
          const existing = channel.permissionOverwrites.cache.get(roleId);
          if (existing?.allow.has(PermissionFlagsBits.SendMessages)) {
            skipped++;
            continue;
          }

          // Add or update the overwrite for this role
          const existingIndex = overwrites.findIndex(o => o.id === roleId);
          if (existingIndex >= 0) {
            overwrites[existingIndex] = {
              id: roleId,
              allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
            };
          } else {
            overwrites.push({
              id: roleId,
              allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.ViewChannel]
            });
          }

          updated++;
          channelNeedsUpdate = true;
        }

        // ✅ One single API call per channel instead of 11
        if (channelNeedsUpdate) {
          await channel.permissionOverwrites.set(overwrites);
        }

      } catch {
        failed += validRoles.length;
      }
    }

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
