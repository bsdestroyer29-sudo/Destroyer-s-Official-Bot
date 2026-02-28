import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} from "discord.js";

import CountingState from "../../models/CountingState.js";

const COUNTING_CHANNEL_ID = "1477190655682805864";
const MAX_COUNT = 1000000;

export default {
  data: new SlashCommandBuilder()
    .setName("counting")
    .setDescription("Counting commands.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub
      .setName("add")
      .setDescription("Manually set the current count.")
      .addIntegerOption(o => o
        .setName("number")
        .setDescription("The number to set as current count (1 - 1,000,000)")
        .setMinValue(1)
        .setMaxValue(MAX_COUNT)
        .setRequired(true)
      )
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();

    if (sub === "add") {
      await interaction.deferReply({ ephemeral: true });

      const number = interaction.options.getInteger("number");
      const guildId = interaction.guild.id;

      let state = await CountingState.findOne({ guildId });
      if (!state) {
        state = await CountingState.create({
          guildId,
          currentCount: 0,
          lastUserId: null,
          highestCount: 0
        });
      }

      const previous = state.currentCount;

      state.currentCount = number;
      state.lastUserId = null;

      if (number > state.highestCount) {
        state.highestCount = number;
      }

      await state.save();

      const countingChannel = interaction.guild.channels.cache.get(COUNTING_CHANNEL_ID);
      if (countingChannel) {
        const embed = new EmbedBuilder()
          .setColor("Blue")
          .setTitle("🔢 Count Updated!")
          .setDescription(
            `The count has been manually set by **${interaction.user.tag}**.`
          )
          .addFields(
            { name: "Previous Count", value: `**${previous.toLocaleString()}**`, inline: true },
            { name: "Current Count", value: `**${number.toLocaleString()}**`, inline: true },
            { name: "Next Number", value: `**${(number + 1).toLocaleString()}**`, inline: true },
            { name: "🏆 Highest Ever", value: `**${state.highestCount.toLocaleString()}**`, inline: true }
          )
          .setFooter({ text: `Set by ${interaction.user.tag}` })
          .setTimestamp();

        await countingChannel.send({ embeds: [embed] });
      }

      return interaction.editReply(`✅ Count set to **${number.toLocaleString()}**. Next number is **${(number + 1).toLocaleString()}**.`);
    }
  }
};
