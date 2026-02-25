import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder
} from "discord.js";

const LOG_CHANNEL_ID = "1475508584744747162";

export default {
  data: new SlashCommandBuilder()
    .setName("setchannel")
    .setDescription("Channel configuration tools")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)

    .addSubcommand(sub =>
      sub
        .setName("permissions")
        .setDescription("Apply permission template to multiple channels (max 50)")
        .addStringOption(option =>
          option
            .setName("channels")
            .setDescription("Mention or paste channel IDs separated by space (max 50)")
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName("template")
            .setDescription("Permission template")
            .setRequired(true)
            .addChoices(
              { name: "🟢 Normal Chat", value: "normal" },
              { name: "🔒 Locked", value: "locked" },
              { name: "👁 View Only", value: "viewonly" },
              { name: "🛡 Staff Only", value: "staff" },
              { name: "📢 Announcements", value: "announce" }
            )
        )
    ),

  async execute(interaction) {

    await interaction.deferReply({ ephemeral: true });

    const template = interaction.options.getString("template");
    const rawChannels = interaction.options.getString("channels");

    const everyoneRole = interaction.guild.roles.everyone;

    // Extract channel IDs from mentions or raw IDs
    const channelIds = rawChannels
      .match(/\d{17,20}/g) || [];

    if (!channelIds.length) {
      return interaction.editReply("❌ No valid channel IDs found.");
    }

    if (channelIds.length > 50) {
      return interaction.editReply("❌ You can modify maximum 50 channels at once.");
    }

    let permissions = {};

    switch (template) {
      case "normal":
        permissions = {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        };
        break;

      case "locked":
        permissions = {
          SendMessages: false
        };
        break;

      case "viewonly":
        permissions = {
          ViewChannel: true,
          SendMessages: false,
          AddReactions: false
        };
        break;

      case "staff":
        permissions = {
          ViewChannel: false
        };
        break;

      case "announce":
        permissions = {
          ViewChannel: true,
          SendMessages: false,
          AddReactions: false
        };
        break;

      default:
        return interaction.editReply("❌ Invalid template.");
    }

    let success = 0;
    let failed = 0;

    for (const id of channelIds) {
      const channel = interaction.guild.channels.cache.get(id);

      if (!channel || channel.type !== ChannelType.GuildText) {
        failed++;
        continue;
      }

      try {
        await channel.permissionOverwrites.edit(everyoneRole, permissions);
        success++;
      } catch {
        failed++;
      }
    }

    // Logging
    const logChannel = interaction.client.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle("⚙ Channel Template Applied")
        .addFields(
          { name: "Template", value: template },
          { name: "Modified", value: `${success}`, inline: true },
          { name: "Failed", value: `${failed}`, inline: true },
          { name: "Moderator", value: `${interaction.user.tag} (${interaction.user.id})` }
        )
        .setTimestamp();

      logChannel.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
    }

    return interaction.editReply(
      `✅ Template **${template}** applied to ${success} channel(s).\n❌ Failed: ${failed}`
    );
  }
};