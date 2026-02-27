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
    .addStringOption(o => o.setName("title").setDescription("Panel title").setRequired(true))
    .addStringOption(o => o.setName("description").setDescription("Panel description").setRequired(true))
    .addChannelOption(o => o.setName("channel").setDescription("Channel to post the panel in").setRequired(true))
    // Role 1
    .addRoleOption(o => o.setName("role1").setDescription("Role 1").setRequired(true))
    .addStringOption(o => o.setName("label1").setDescription("Label for role 1").setRequired(true))
    .addStringOption(o => o.setName("desc1").setDescription("Description for role 1").setRequired(false))
    // Role 2
    .addRoleOption(o => o.setName("role2").setDescription("Role 2").setRequired(false))
    .addStringOption(o => o.setName("label2").setDescription("Label for role 2").setRequired(false))
    .addStringOption(o => o.setName("desc2").setDescription("Description for role 2").setRequired(false))
    // Role 3
    .addRoleOption(o => o.setName("role3").setDescription("Role 3").setRequired(false))
    .addStringOption(o => o.setName("label3").setDescription("Label for role 3").setRequired(false))
    .addStringOption(o => o.setName("desc3").setDescription("Description for role 3").setRequired(false))
    // Role 4
    .addRoleOption(o => o.setName("role4").setDescription("Role 4").setRequired(false))
    .addStringOption(o => o.setName("label4").setDescription("Label for role 4").setRequired(false))
    .addStringOption(o => o.setName("desc4").setDescription("Description for role 4").setRequired(false))
    // Role 5
    .addRoleOption(o => o.setName("role5").setDescription("Role 5").setRequired(false))
    .addStringOption(o => o.setName("label5").setDescription("Label for role 5").setRequired(false))
    .addStringOption(o => o.setName("desc5").setDescription("Description for role 5").setRequired(false))
    // Role 6
    .addRoleOption(o => o.setName("role6").setDescription("Role 6").setRequired(false))
    .addStringOption(o => o.setName("label6").setDescription("Label for role 6").setRequired(false))
    .addStringOption(o => o.setName("desc6").setDescription("Description for role 6").setRequired(false))
    // Role 7
    .addRoleOption(o => o.setName("role7").setDescription("Role 7").setRequired(false))
    .addStringOption(o => o.setName("label7").setDescription("Label for role 7").setRequired(false))
    .addStringOption(o => o.setName("desc7").setDescription("Description for role 7").setRequired(false))
    // Role 8
    .addRoleOption(o => o.setName("role8").setDescription("Role 8").setRequired(false))
    .addStringOption(o => o.setName("label8").setDescription("Label for role 8").setRequired(false))
    .addStringOption(o => o.setName("desc8").setDescription("Description for role 8").setRequired(false))
    // Role 9
    .addRoleOption(o => o.setName("role9").setDescription("Role 9").setRequired(false))
    .addStringOption(o => o.setName("label9").setDescription("Label for role 9").setRequired(false))
    .addStringOption(o => o.setName("desc9").setDescription("Description for role 9").setRequired(false))
    // Role 10
    .addRoleOption(o => o.setName("role10").setDescription("Role 10").setRequired(false))
    .addStringOption(o => o.setName("label10").setDescription("Label for role 10").setRequired(false))
    .addStringOption(o => o.setName("desc10").setDescription("Description for role 10").setRequired(false))
    // Role 11
    .addRoleOption(o => o.setName("role11").setDescription("Role 11").setRequired(false))
    .addStringOption(o => o.setName("label11").setDescription("Label for role 11").setRequired(false))
    .addStringOption(o => o.setName("desc11").setDescription("Description for role 11").setRequired(false))
    // Role 12
    .addRoleOption(o => o.setName("role12").setDescription("Role 12").setRequired(false))
    .addStringOption(o => o.setName("label12").setDescription("Label for role 12").setRequired(false))
    .addStringOption(o => o.setName("desc12").setDescription("Description for role 12").setRequired(false))
    // Role 13
    .addRoleOption(o => o.setName("role13").setDescription("Role 13").setRequired(false))
    .addStringOption(o => o.setName("label13").setDescription("Label for role 13").setRequired(false))
    .addStringOption(o => o.setName("desc13").setDescription("Description for role 13").setRequired(false))
    // Role 14
    .addRoleOption(o => o.setName("role14").setDescription("Role 14").setRequired(false))
    .addStringOption(o => o.setName("label14").setDescription("Label for role 14").setRequired(false))
    .addStringOption(o => o.setName("desc14").setDescription("Description for role 14").setRequired(false))
    // Role 15
    .addRoleOption(o => o.setName("role15").setDescription("Role 15").setRequired(false))
    .addStringOption(o => o.setName("label15").setDescription("Label for role 15").setRequired(false))
    .addStringOption(o => o.setName("desc15").setDescription("Description for role 15").setRequired(false)),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const title = interaction.options.getString("title");
    const description = interaction.options.getString("description");
    const channel = interaction.options.getChannel("channel");

    // Collect all roles
    const roles = [];
    for (let i = 1; i <= 15; i++) {
      const role = interaction.options.getRole(`role${i}`);
      const label = interaction.options.getString(`label${i}`);
      if (!role || !label) continue;
      const desc = interaction.options.getString(`desc${i}`) || null;
      roles.push({ roleId: role.id, label, description: desc });
    }

    if (!roles.length) {
      return interaction.editReply("❌ You must provide at least one role.");
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
          description: r.description || undefined,
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

    // Save config
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
