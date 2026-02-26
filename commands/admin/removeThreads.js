import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from "discord.js";

const EVERYONE_THREAD_LOCK = {
  CreatePublicThreads: false,
  CreatePrivateThreads: false,
  SendMessagesInThreads: false
};

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export default {
  data: new SlashCommandBuilder()
    .setName("remove")
    .setDescription("Server-wide tools")
    .addSubcommand(sub =>
      sub
        .setName("threads")
        .setDescription("Disable creating and sending in threads for @everyone in all channels")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    if (!guild) return interaction.editReply("❌ This can only be used in a server.");

    const channels = guild.channels.cache;

    let success = 0;
    let failed = 0;
    let skipped = 0;

    // Channel types where overwrites make sense
    const allowedTypes = new Set([
      ChannelType.GuildText,
      ChannelType.GuildAnnouncement,
      ChannelType.GuildForum,
      ChannelType.GuildMedia,
      ChannelType.GuildVoice,
      ChannelType.GuildStageVoice,
      ChannelType.GuildCategory
    ]);

    for (const ch of channels.values()) {
      try {
        if (!allowedTypes.has(ch.type)) {
          skipped++;
          continue;
        }

        await ch.permissionOverwrites.edit(guild.roles.everyone, EVERYONE_THREAD_LOCK);
        success++;

        // tiny delay to avoid rate limits when there are tons of channels
        await sleep(250);
      } catch {
        failed++;
      }
    }

    return interaction.editReply(
      `✅ Thread permissions removed server-wide.\n` +
      `Success: ${success}\n` +
      `Failed: ${failed}\n` +
      `Skipped: ${skipped}`
    );
  }
};
