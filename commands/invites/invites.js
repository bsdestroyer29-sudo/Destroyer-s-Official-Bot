import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import Invite from "../../models/Invite.js";

export default {
  data: new SlashCommandBuilder()
    .setName("invites")
    .setDescription("Check invites of a user")
    .addUserOption(opt =>
      opt.setName("user")
        .setDescription("User")
        .setRequired(false)
    ),

  async execute(interaction) {

    const user = interaction.options.getUser("user") || interaction.user;

    const data = await Invite.findOne({
      guildId: interaction.guild.id,
      inviterId: user.id
    });

    const invites = data?.invites || 0;
    const fake = data?.fakeInvites || 0;
    const leaves = data?.leaves || 0;

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle(`📨 Invite Stats - ${user.tag}`)
      .addFields(
        { name: "Real Invites", value: invites.toString(), inline: true },
        { name: "Fake Invites", value: fake.toString(), inline: true },
        { name: "Leaves", value: leaves.toString(), inline: true }
      )
      .setTimestamp();

    interaction.reply({ embeds: [embed] });
  }
};