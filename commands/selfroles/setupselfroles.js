import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

import SelfRoleConfig from "../../models/SelfRoleConfig.js";

export default {
  data: new SlashCommandBuilder()
    .setName("setupselfroles")
    .setDescription("Set up a self roles panel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addStringOption(o => o
      .setName("title")
      .setDescription("Panel title")
      .setRequired(true)
    )
    .addStringOption(o => o
      .setName("description")
      .setDescription("Panel description")
      .setRequired(true)
    )
    .addChannelOption(o => o
      .setName("channel")
      .setDescription("Channel to post the panel in")
      .setRequired(true)
    )
    .addStringOption(o => o
      .setName("roles")
      .setDescription("Format: roleID:Label:emoji, roleID:Label (emoji optional, up to 15)")
      .setRequired(true)
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const title = interaction.options.getString("title");
    const description = interaction.options.getString("description");
    const channel = interaction.options.getChannel("channel");
    const rolesInput = interaction.options.getString("roles");

    const parsed = rolesInput.split(",").map(r => r.trim()).filter(Boolean);

    if (!parsed.length) {
      return interaction.editReply("❌ No roles provided. Format: `roleID:Label:emoji, roleID:Label`");
    }

    if (parsed.length > 15) {
      return interaction.editReply("❌ Maximum 15 roles allowed.");
    }

    const roles = [];
    const errors = [];

    for (const entry of parsed) {
      const parts = entry.split(":");
      const roleId = parts[0]?.trim();
      const label = parts[1]?.trim();
      const emoji = parts[2]?.trim() || null;

      if (!roleId || !label) {
        errors.push(`❌ Invalid format: \`${entry}\` — use \`roleID:Label\` or \`roleID:Label:emoji\``);
        continue;
      }

      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) {
        errors.push(`❌ Role not found: \`${roleId}\``);
        continue;
      }

      roles.push({ roleId: role.id, label, emoji });
    }

    if (errors.length) {
      return interaction.editReply(errors.join("\n"));
    }

    if (!roles.length) {
      return interaction.editReply("❌ No valid roles found.");
    }

    // Build dropdown
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("selfrole_select")
      .setPlaceholder("🎭 Choose your roles...")
      .setMinValues(1)
      .setMaxValues(roles.length)
      .addOptions(
        roles.map(r => ({
          label: r.label,
          value: r.roleId,
          ...(r.emoji ? { emoji: r.emoji } : {})
        }))
      );

    const removeButton = new ButtonBuilder()
      .setCustomId("selfrole_remove")
      .setLabel("Remove All Roles")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🗑️");

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(removeButton);

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle(title)
      .setDescription(description)
      .addFields({
        name: "━━━━━━━━━━━━━━━━━━━━━━",
        value: roles.map(r => `${r.emoji ? r.emoji : "🔴"} <@&${r.roleId}> — **${r.label}**`).join("\n"),
      })
      .setImage("https://i.imgur.com/your-banner-here.png") // replace with your banner URL
      .setFooter({ text: "Select roles from the dropdown • Remove all with the button below" })
      .setTimestamp();

    const msg = await channel.send({
      embeds: [embed],
      components: [row1, row2]
    });

    await SelfRoleConfig.create({
      guildId: interaction.guild.id,
      panelChannelId: channel.id,
      panelMessageId: msg.id,
      title,
      description,
      roles
    });

    return interaction.editReply(`✅ Self roles panel created in ${channel}!`);
  }
};
