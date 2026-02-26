import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType
} from "discord.js";

const TEMPLATES = {

  normal: {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AttachFiles: true,
    EmbedLinks: true,
    AddReactions: true
  },

  staff: {
    ViewChannel: false,
    SendMessages: false
  },

  locked: {
    SendMessages: false
  },

  "read-only": {
    ViewChannel: true,
    SendMessages: false,
    AddReactions: false
  },

  announcements: {
    ViewChannel: true,
    SendMessages: false,
    AddReactions: false,
    EmbedLinks: true,
    AttachFiles: false
  },

  media: {
    ViewChannel: true,
    SendMessages: true,
    AttachFiles: true,
    EmbedLinks: true,
    AddReactions: true
  },

  private: {
    ViewChannel: false
  },

  "voice-open": {
    ViewChannel: true,
    Connect: true,
    Speak: true
  },

  "voice-locked": {
    Connect: false,
    Speak: false
  },

  ticket: {
    ViewChannel: false,
    SendMessages: false,
    ReadMessageHistory: false
  },

  "application-review": {
    ViewChannel: true,
    SendMessages: false,
    AddReactions: false,
    AttachFiles: false
  },

  "news-feed": {
    ViewChannel: true,
    SendMessages: false,
    AddReactions: false,
    EmbedLinks: true
  }

};

export default {
  data: new SlashCommandBuilder()
    .setName("setchannel")
    .setDescription("Apply permission template to channels")
    .addSubcommand(sub =>
      sub
        .setName("permissions")
        .setDescription("Apply permission template")
        .addStringOption(option =>
          option
            .setName("template")
            .setDescription("Template name")
            .setRequired(true)
            .addChoices(
              ...Object.keys(TEMPLATES).map(t => ({
                name: t,
                value: t
              }))
            )
        )
        .addStringOption(option =>
          option
            .setName("channels")
            .setDescription("Channel IDs separated by space (max 50)")
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {

    await interaction.deferReply({ ephemeral: true });

    const templateName = interaction.options.getString("template");
    const channelInput = interaction.options.getString("channels");

    const template = TEMPLATES[templateName];
    if (!template) {
      return interaction.editReply("❌ Invalid template.");
    }

    const channelIds = channelInput.split(/\s+/).slice(0, 50);

    let success = 0;
    let failed = 0;

    for (const id of channelIds) {
      const channel = interaction.guild.channels.cache.get(id);
      if (!channel) {
        failed++;
        continue;
      }

      try {
        await channel.permissionOverwrites.edit(
          interaction.guild.roles.everyone,
          template
        );
        success++;
      } catch {
        failed++;
      }
    }

    return interaction.editReply(
      `✅ Applied **${templateName}** template.\n` +
      `Success: ${success}\n` +
      `Failed: ${failed}`
    );
  }
};
