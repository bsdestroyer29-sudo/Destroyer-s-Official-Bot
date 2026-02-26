import { Client, GatewayIntentBits, Collection, REST, Routes, Partials } from "discord.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// ===== PATH FIX =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== ENV =====
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const MONGO_URI = process.env.MONGO_URI;

if (!TOKEN || !CLIENT_ID || !GUILD_ID || !MONGO_URI) {
  console.error("❌ Missing env vars: TOKEN, CLIENT_ID, GUILD_ID, MONGO_URI");
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
  partials: [Partials.Channel, Partials.Message, Partials.Reaction]
});

client.commands = new Collection();

// =================================================
// LOAD COMMANDS (RECURSIVE)
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
      console.warn(`⚠️ Skipping invalid command file: ${fullPath}`);
      continue;
    }

    client.commands.set(cmd.data.name, cmd);
    commands.push(cmd.data.toJSON());
  }
}

// =================================================
// LOAD EVENTS (RECURSIVE)
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
      console.warn(`⚠️ Skipping invalid event file: ${fullPath}`);
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
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
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
// READY
// =================================================
client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log("✅ BUILD: Events Router Active");
});

// =================================================
// STARTUP
// =================================================
(async () => {
  await connectMongo();
  await loadCommands(commandsPath);
  await loadEvents(eventsPath);
  await registerCommands();
  await client.login(TOKEN);
})();