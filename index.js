import {
  Client,
  GatewayIntentBits,
  Collection,
  REST,
  Routes,
  Partials
} from "discord.js";

import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const MONGO_URI = process.env.MONGO_URI;

if (!TOKEN || !CLIENT_ID || !GUILD_ID || !MONGO_URI) {
  console.error("❌ Missing env vars: TOKEN, CLIENT_ID, GUILD_ID, MONGO_URI");
  process.exit(1);
}

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

    const command = (await import(`file://${fullPath}`)).default;

    if (!command?.data?.name) {
      console.warn(`⚠️ Skipping invalid command file: ${fullPath}`);
      continue;
    }

    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
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

    const event = (await import(`file://${fullPath}`)).default;

    if (!event?.name || typeof event.execute !== "function") {
      console.warn(`⚠️ Skipping invalid event file: ${fullPath}`);
      continue;
    }

    if (event.once)
      client.once(event.name, (...args) => event.execute(...args, client));
    else
      client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// =================================================
// SLASH COMMAND HANDLER
// =================================================
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (err) {
    console.error("❌ Slash command error:", err);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply("❌ Error executing command.");
    } else {
      await interaction.reply({
        content: "❌ Error executing command.",
        ephemeral: true
      });
    }
  }
});

// =================================================
// CONTEXT MENU HANDLER
// =================================================
client.on("interactionCreate", async interaction => {
  if (!interaction.isMessageContextMenuCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (err) {
    console.error("❌ Context menu error:", err);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply("❌ Error executing command.");
    } else {
      await interaction.reply({
        content: "❌ Error executing command.",
        ephemeral: true
      });
    }
  }
});

// =================================================
// BUTTON HANDLER
// =================================================
client.on("interactionCreate", async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "application_entry") {
    const { default: applicationEntry } = await import("./events/applicationEntry.js");
    return applicationEntry.run(interaction);
  }

  if (
    interaction.customId.startsWith("app_submit_") ||
    interaction.customId.startsWith("app_accept_") ||
    interaction.customId.startsWith("app_decline_")
  ) {
    const { default: applicationSystem } = await import("./events/applicationSystem.js");
    return applicationSystem.execute(interaction, client);
  }

  if (interaction.customId === "selfrole_remove") {
    const { default: selfRoles } = await import("./events/selfRoles.js");
    return selfRoles.execute(interaction, client);
  }
});

// =================================================
// SELECT MENU HANDLER
// =================================================
client.on("interactionCreate", async interaction => {
  if (!interaction.isStringSelectMenu()) return;

  if (interaction.customId === "selfrole_select") {
    const { default: selfRoles } = await import("./events/selfRoles.js");
    return selfRoles.execute(interaction, client);
  }
});

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
// READY
// =================================================
client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log("🚀 Bot fully operational.");
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