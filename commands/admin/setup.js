import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Setup the ticket panel")
    .addChannelOption(option =>
      option
        .setName("channel")
        .setDescription("Channel where the ticket panel will be sent")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("panel_title")
        .setDescription("Ticket panel title")
        .setRequired(true)
        .setMaxLength(256)
    )
    .addStringOption(option =>
      option
        .setName("panel_description")
        .setDescription("Ticket panel description")
        .setRequired(true)
        .setMaxLength(2000)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "❌ Admins only.", ephemeral: true });
    }

    const channel = interaction.options.getChannel("channel");
    const panelTitle = interaction.options.getString("panel_title");
    const panelDescription = interaction.options.getString("panel_description");

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(panelTitle)
      .setDescription(
        `${panelDescription}\n\n` +
        "✅ Click the button below to open a ticket.\n" +
        "🔒 Only you and staff will see it."
      )
      .setFooter({ text: "Destroyer | YT Bot • Ticket System" });

    const panelId = Date.now().toString();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket_create_${panelId}`)
        .setLabel("Open Ticket")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🎫")
    );

    await channel.send({ embeds: [embed], components: [row] });

    await interaction.reply({
      content: `✅ Ticket panel sent in <#${channel.id}>`,
      ephemeral: true
    });
  }
};