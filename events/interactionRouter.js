import { Events } from "discord.js";

export default {
  name: Events.InteractionCreate,
  once: false,

  async execute(interaction, client) {
    try {
      // =========================
      // ✅ BUTTONS (ALWAYS ACK FAST)
      // =========================
      if (interaction.isButton()) {
        console.log("🟦 BUTTON CLICK:", interaction.customId);

        await interaction.deferReply({ ephemeral: true }).catch(() => {});

        // Entry button
        if (interaction.customId === "application_entry") {
          const ev = await import("./applicationEntry.js");
          return ev.default.run(interaction, client);
        }

        // Submit button
        if (interaction.customId.startsWith("app_submit_")) {
          const ev = await import("./applicationSubmit.js");
          return ev.default.run(interaction, client);
        }

        return interaction.editReply("✅ Button received.").catch(() => {});
      }

      // =========================
      // ✅ SLASH + CONTEXT MENU
      // =========================
      if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        return await command.execute(interaction, client);
      }
    } catch (err) {
      console.error("❌ interactionRouter error:", err);

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: "❌ Error.", ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content: "❌ Error.", ephemeral: true }).catch(() => {});
      }
    }
  }
};