import { Client, GatewayIntentBits, Collection, REST, Routes, Partials, EmbedBuilder } from "discord.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import ApplicationConfig from "./models/ApplicationConfig.js";
import ApplicationSession from "./models/ApplicationSession.js";

dotenv.config();

// ===== PATH FIX FOR ES MODULES =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== ENV =====
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const MONGO_URI = process.env.MONGO_URI;

// Optional (if you want submissions to go somewhere)
const APPLICATION_REVIEW_CHANNEL_ID = process.env.APPLICATION_REVIEW_CHANNEL_ID || "";

if (!TOKEN || !CLIENT_ID || !GUILD_ID || !MONGO_URI) {
  console.error("❌ Missing environment variables (TOKEN, CLIENT_ID, GUILD_ID, MONGO_URI).");
  process.exit(1);
}

// ===== CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.MessageContent
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.Reaction
  ]
});

client.commands = new Collection();

// =================================================
// LOAD COMMANDS (WITH SUBFOLDERS)
// =================================================
const commands = [];
const commandsPath = path.join(__dirname, "commands");

async function loadCommands(dir) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir);

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = fs.lstatSync(fullPath);

    if (stat.isDirectory()) {
      await loadCommands(fullPath);
      continue;
    }

    if (!entry.endsWith(".js")) continue;

    const cmd = (await import(`file://${fullPath}`)).default;
    if (!cmd?.data?.name) {
      console.warn(`⚠️ Skipping invalid command file: ${entry}`);
      continue;
    }

    client.commands.set(cmd.data.name, cmd);
    commands.push(cmd.data.toJSON());
  }
}

// =================================================
// LOAD EVENTS (WITH SUBFOLDERS)
// =================================================
const eventsPath = path.join(__dirname, "events");

async function loadEvents(dir) {
  if (!fs.existsSync(dir)) return;

  const entries = fs.readdirSync(dir);

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = fs.lstatSync(fullPath);

    if (stat.isDirectory()) {
      await loadEvents(fullPath);
      continue;
    }

    if (!entry.endsWith(".js")) continue;

    const ev = (await import(`file://${fullPath}`)).default;
    if (!ev?.name || typeof ev.execute !== "function") {
      console.warn(`⚠️ Skipping invalid event file: ${entry}`);
      continue;
    }

    if (ev.once) client.once(ev.name, (...args) => ev.execute(...args, client));
    else client.on(ev.name, (...args) => ev.execute(...args, client));
  }
}

// =================================================
// REGISTER SLASH COMMANDS (GUILD)
// =================================================
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    console.log("🔄 Registering slash commands...");
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("✅ Slash commands registered.");
  } catch (err) {
    console.error("❌ Slash registration error:", err);
  }
}

// =================================================
// CONNECT MONGO
// =================================================
async function connectMongo() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("🟢 MongoDB connected.");
  } catch (err) {
    console.error("🔴 MongoDB connection failed:", err);
    process.exit(1);
  }
}

// =================================================
// HELPERS FOR APPLICATION BUTTONS
// =================================================
function createProgressBar(current, total) {
  const percent = Math.floor((current / total) * 10);
  return "🟦".repeat(percent) + "⬜".repeat(10 - percent);
}

async function handleApplicationEntry(interaction) {
  // ✅ prevent "thinking stuck"
  await interaction.deferReply({ ephemeral: true });

  const panelMessageId = interaction.message?.id;
  const config = await ApplicationConfig.findOne({ panelMessageId });

  if (!config) return interaction.editReply("❌ Panel config not found. Ask staff to re-run setup.");
  if (!config.isOpen) return interaction.editReply("🔒 Sorry, this application is closed right now.");

  const existing = await ApplicationSession.findOne({
    userId: interaction.user.id,
    panelMessageId: config.panelMessageId,
    completed: false
  });

  if (existing) {
    return interaction.editReply("⚠️ You already have an application in progress. Check your DMs.");
  }

  const session = await ApplicationSession.create({
    guildId: interaction.guild.id,
    userId: interaction.user.id,
    panelMessageId: config.panelMessageId,
    currentQuestion: 0,
    answers: [],
    completed: false,
    waitingForSubmit: false
  });

  const total = config.questions.length;
  const firstQ = config.questions[0] || "No questions set.";

  const embed = new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle(`📝 ${config.title}`)
    .setDescription(
      `**Application Started**\n\n` +
      `### Question 1 / ${total}\n` +
      `**${firstQ}**`
    )
    .addFields({
      name: "Progress",
      value: `${createProgressBar(0, total)}\n0/${total}`
    })
    .setFooter({ text: "Reply in this DM with your answer." })
    .setTimestamp();

  try {
    await interaction.user.send({ embeds: [embed] });
    return interaction.editReply("✅ Check your DMs — I sent your first question.");
  } catch {
    await ApplicationSession.deleteOne({ _id: session._id }).catch(() => {});
    return interaction.editReply(
      "❌ I couldn’t DM you.\nEnable DMs from server members, then press **Entry** again."
    );
  }
}

async function handleApplicationSubmit(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const sessionId = interaction.customId.replace("app_submit_", "");
  const session = await ApplicationSession.findById(sessionId);

  if (!session) return interaction.editReply("❌ Session not found.");
  if (String(session.userId) !== String(interaction.user.id)) {
    return interaction.editReply("❌ This isn’t your application.");
  }
  if (session.completed) return interaction.editReply("✅ Already submitted.");

  session.completed = true;
  await session.save();

  // Optional: send to review channel
  if (APPLICATION_REVIEW_CHANNEL_ID) {
    const reviewChannel = await client.channels.fetch(APPLICATION_REVIEW_CHANNEL_ID).catch(() => null);

    if (reviewChannel?.isTextBased()) {
      const config = await ApplicationConfig.findOne({ panelMessageId: session.panelMessageId });

      const lines = session.answers.map((a, i) =>
        `**${i + 1}. ${a.question}**\n${a.answer}\n`
      );

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("📨 New Application Submitted")
        .setDescription(
          `User: <@${session.userId}>\n` +
          `Type: **${config?.title || "Application"}**\n\n` +
          lines.join("\n").slice(0, 3800)
        )
        .setTimestamp();

      await reviewChannel.send({ embeds: [embed] }).catch(() => {});
    }
  }

  return interaction.editReply("✅ Submitted! Staff will review your application.");
}

client.on("interactionCreate", async (interaction) => {
  try {

    // ======================
    // BUTTONS
    // ======================
    if (interaction.isButton()) {
      console.log("🟦 BUTTON CLICK:", interaction.customId);

      await interaction.deferReply({ ephemeral: true });

      if (interaction.customId === "application_entry") {
        return handleApplicationEntry(interaction);
      }

      if (interaction.customId.startsWith("app_submit_")) {
        return handleApplicationSubmit(interaction);
      }

      return interaction.editReply("⚠️ Unknown button.");
    }

    // ======================
    // SLASH COMMANDS
    // ======================
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      return await command.execute(interaction, client);
    }

    // ======================
    // CONTEXT MENU
    // ======================
    if (interaction.isContextMenuCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      return await command.execute(interaction, client);
    }

  } catch (err) {
    console.error("❌ interaction error:", err);

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: "❌ Error.", ephemeral: true }).catch(() => {});
    } else {
      await interaction.reply({ content: "❌ Error.", ephemeral: true }).catch(() => {});
    }
  }
});

// =================================================
// READY
// =================================================
client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

// =================================================
// STARTUP SEQUENCE
// =================================================
(async () => {
  await connectMongo();
  await loadCommands(commandsPath);
  await loadEvents(eventsPath);
  await registerCommands();
  await client.login(TOKEN);
})();