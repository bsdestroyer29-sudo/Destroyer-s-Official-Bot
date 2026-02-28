import { EmbedBuilder } from "discord.js";
import CountingState from "../models/CountingState.js";

const COUNTING_CHANNEL_ID = "1477190655682805864";

export default {
  name: "messageCreate",
  once: false,

  async execute(message, client) {
    if (message.channel.id !== COUNTING_CHANNEL_ID) return;
    if (message.author.bot) return;

    const number = parseInt(message.content.trim());

    // Ignore non-number messages
    if (isNaN(number)) return;

    const guildId = message.guild.id;

    // Get or create counting state
    let state = await CountingState.findOne({ guildId });
    if (!state) {
      state = await CountingState.create({
        guildId,
        currentCount: 0,
        lastUserId: null,
        highestCount: 0
      });
    }

    const expected = state.currentCount + 1;

    // ✅ FAIL: same user counted twice in a row
    if (message.author.id === state.lastUserId) {
      const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("❌ Count Ruined!")
        .setDescription(
          `**${message.author}** counted twice in a row and ruined it!\n\n` +
          `The count has been reset back to **0**.`
        )
        .addFields(
          { name: "💀 Ruined At", value: `**${state.currentCount}**`, inline: true },
          { name: "🏆 Highest Ever", value: `**${state.highestCount}**`, inline: true }
        )
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: "Start counting again from 1!" })
        .setTimestamp();

      state.currentCount = 0;
      state.lastUserId = null;
      await state.save();

      return message.channel.send({ embeds: [embed] });
    }

    // ✅ FAIL: wrong number
    if (number !== expected) {
      const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("❌ Wrong Number!")
        .setDescription(
          `**${message.author}** said **${number}** but the next number was **${expected}**!\n\n` +
          `The count has been reset back to **0**.`
        )
        .addFields(
          { name: "💀 Ruined At", value: `**${state.currentCount}**`, inline: true },
          { name: "🏆 Highest Ever", value: `**${state.highestCount}**`, inline: true }
        )
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: "Start counting again from 1!" })
        .setTimestamp();

      state.currentCount = 0;
      state.lastUserId = null;
      await state.save();

      return message.channel.send({ embeds: [embed] });
    }

    // ✅ CORRECT number
    state.currentCount = number;
    state.lastUserId = message.author.id;

    // Update highest count if beaten
    if (number > state.highestCount) {
      state.highestCount = number;
    }

    await state.save();

    // React with checkmark
    await message.react("✅").catch(() => {});

    // Milestone messages at round numbers
    if (number % 100 === 0) {
      const milestoneEmbed = new EmbedBuilder()
        .setColor("Gold")
        .setTitle("🎉 Milestone Reached!")
        .setDescription(`Amazing! You reached **${number}**! Keep going!`)
        .setTimestamp();

      await message.channel.send({ embeds: [milestoneEmbed] });
    }
  }
};
