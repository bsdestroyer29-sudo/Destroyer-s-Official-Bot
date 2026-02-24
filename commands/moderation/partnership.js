import {
  SlashCommandBuilder,
  PermissionFlagsBits
} from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("partnership")
    .setDescription("Partnership tools")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)

    .addSubcommand(sub =>
      sub
        .setName("message")
        .setDescription("Show the server promotion message")
    ),

  async execute(interaction) {

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: "❌ Staff only.",
        ephemeral: true
      });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "message") {

      const promoMessage = `
🔥 **Destroyer | YT Community** 🔥

🎮 Brawl Stars focused server  
📢 Active community  
🎉 Events & giveaways  
🤝 Friendly staff team  

Join us and be part of something growing fast 🚀  

🔗 https://discord.gg/QZ98GeeC3x
`;

      await interaction.reply({
        content: promoMessage,
        ephemeral: true
      });
    }
  }
};