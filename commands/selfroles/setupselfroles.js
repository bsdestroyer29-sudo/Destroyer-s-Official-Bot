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
      .setDescription("Roles in format: roleID:Label, roleID:Label (up to 15)")
      .setRequired(true)
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const title = interaction.options.getString("title");
    const description = interaction.options.getString("description");
    const channel = interaction.options.getChannel("channel");
    const rolesInput = interaction.options.getString("roles");

    // Parse roles string
    const parsed = rolesInput.split(",").map(r => r.trim()).filter(Boolean);

    if (!parsed.length) {
      return interaction.editReply("❌ No roles provided. Format: `roleID:Label, roleID:Label`");
    }

    if (parsed.length > 15) {
      return interaction.editReply("❌ Maximum 15 roles allowed.");
    }

    const roles = [];
    const errors = [];

    for (const entry of parsed) {
      const [roleId, ...labelParts] = entry.split(":");
      const label = labelParts.join(":").trim();

      if (!roleId || !label) {
        errors.push(`❌ Invalid format: \`${entry}\` — use \`roleID:Label\``);
        continue;
      }

      const role = interaction.guild.roles.cache.get(roleId.trim());
      if (!role) {
        errors.push(`❌ Role not found: \`${roleId.trim()}\``);
        continue;
      }

      roles.push({ roleId: role.id, label, description: null });
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
      .setPlaceholder("Select roles to add...")
      .setMinValues(1)
      .setMaxValues(roles.length)
      .addOptions(
        roles.map(r => ({
          label: r.label,
          value: r.roleId
        }))
      );

    const removeButton = new ButtonBuilder()
      .setCustomId("selfrole_remove")
      .setLabel("Remove All Roles")
      .setStyle(ButtonStyle.Danger);

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(removeButton);

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle(title)
      .setDescription(description)
      .addFields({
        name: "Available Roles",
        value: roles.map(r => `<@&${r.roleId}> — ${r.label}`).join("\n")
      })
      .setFooter({ text: "Select roles from the dropdown below." })
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

    return interaction.editReply(`✅ Self roles panel created in ${channel}!\n\nTo add roles you used format: \`roleID:Label, roleID:Label\``);
  }
};
