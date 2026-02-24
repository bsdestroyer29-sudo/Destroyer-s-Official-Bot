import { Events } from "discord.js";

// 🔥 CONFIG
const NEWBIE_ROLE_ID = "1461791416706404575";
const MEMBER_ROLE_ID = "1461791458872000706";
const RULES_CHANNEL_ID = "1461715929321836688";
const VERIFY_EMOJI = "✅";

export default {
  name: Events.ClientReady,
  once: false,

  async execute(client) {

    // =========================
    // AUTO ROLE ON JOIN
    // =========================
    client.on("guildMemberAdd", async member => {
      try {
        await member.roles.add(NEWBIE_ROLE_ID);
      } catch (err) {
        console.error("AutoRole Error:", err);
      }
    });

    // =========================
    // REACTION VERIFY
    // =========================
    client.on("messageReactionAdd", async (reaction, user) => {
      try {
        if (user.bot) return;

        if (!reaction.message.guild) return;
        if (reaction.message.channel.id !== RULES_CHANNEL_ID) return;
        if (reaction.emoji.name !== VERIFY_EMOJI) return;

        const member = await reaction.message.guild.members.fetch(user.id);

        if (member.roles.cache.has(MEMBER_ROLE_ID)) return;

        // Give Member role
        await member.roles.add(MEMBER_ROLE_ID);

        // Remove Newbie role
        if (member.roles.cache.has(NEWBIE_ROLE_ID)) {
          await member.roles.remove(NEWBIE_ROLE_ID);
        }

      } catch (err) {
        console.error("Verify Error:", err);
      }
    });

  }
};