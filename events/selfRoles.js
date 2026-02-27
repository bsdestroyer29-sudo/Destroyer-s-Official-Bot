import SelfRoleConfig from "../models/SelfRoleConfig.js";

export default {
  async execute(interaction, client) {
    // ===============================
    // DROPDOWN - ADD ROLES
    // ===============================
    if (interaction.isStringSelectMenu() && interaction.customId === "selfrole_select") {
      await interaction.deferReply({ ephemeral: true });

      const config = await SelfRoleConfig.findOne({
        panelMessageId: interaction.message.id
      });

      if (!config) {
        return interaction.editReply("❌ Self role config not found.");
      }

      const member = await interaction.guild.members.fetch(interaction.user.id);
      const selectedRoleIds = interaction.values;

      const added = [];
      const alreadyHad = [];
      const failed = [];

      for (const roleId of selectedRoleIds) {
        try {
          if (member.roles.cache.has(roleId)) {
            alreadyHad.push(roleId);
            continue;
          }
          await member.roles.add(roleId);
          added.push(roleId);
        } catch (err) {
          console.error(`Failed to add role ${roleId}:`, err);
          failed.push(roleId);
        }
      }

      const lines = [];
      if (added.length) lines.push(`✅ Added: ${added.map(id => `<@&${id}>`).join(", ")}`);
      if (alreadyHad.length) lines.push(`ℹ️ Already had: ${alreadyHad.map(id => `<@&${id}>`).join(", ")}`);
      if (failed.length) lines.push(`❌ Failed: ${failed.map(id => `<@&${id}>`).join(", ")}`);

      return interaction.editReply(lines.join("\n") || "Nothing changed.");
    }

    // ===============================
    // BUTTON - REMOVE ALL ROLES
    // ===============================
    if (interaction.isButton() && interaction.customId === "selfrole_remove") {
      await interaction.deferReply({ ephemeral: true });

      const config = await SelfRoleConfig.findOne({
        panelMessageId: interaction.message.id
      });

      if (!config) {
        return interaction.editReply("❌ Self role config not found.");
      }

      const member = await interaction.guild.members.fetch(interaction.user.id);
      const removed = [];
      const failed = [];

      for (const { roleId } of config.roles) {
        try {
          if (!member.roles.cache.has(roleId)) continue;
          await member.roles.remove(roleId);
          removed.push(roleId);
        } catch (err) {
          console.error(`Failed to remove role ${roleId}:`, err);
          failed.push(roleId);
        }
      }

      const lines = [];
      if (removed.length) lines.push(`✅ Removed: ${removed.map(id => `<@&${id}>`).join(", ")}`);
      if (failed.length) lines.push(`❌ Failed to remove: ${failed.map(id => `<@&${id}>`).join(", ")}`);

      return interaction.editReply(lines.join("\n") || "ℹ️ You didn't have any of these roles.");
    }
  }
};
