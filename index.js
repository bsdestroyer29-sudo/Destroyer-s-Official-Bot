import { Client, GatewayIntentBits, Collection, REST, Routes } from "discord.js";
import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// ===== PATH FIX FOR ES MODULES =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== ENV VARIABLES =====
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const MONGO_URI = process.env.MONGO_URI;

if (!TOKEN || !CLIENT_ID || !GUILD_ID || !MONGO_URI) {
  console.error("❌ Missing environment variables.");
  process.exit(1);
}

// ===== CLIENT =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();

// ===== LOAD COMMANDS =====
const commands = [];
const commandsPath = path.join(__dirname, "commands");

if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = (await import(`file://${filePath}`)).default;

    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
  }
}

// ===== REGISTER SLASH COMMANDS =====
async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  try {
    console.log("🔄 Registering slash commands...");

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("✅ Slash commands registered.");
  } catch (error) {
    console.error("❌ Slash registration error:", error);
  }
}

// ===== CONNECT TO MONGODB =====
async function connectMongo() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("🟢 MongoDB connected.");
  } catch (error) {
    console.error("🔴 MongoDB connection failed:", error);
    process.exit(1);
  }
}

// ===== EVENTS =====
client.once("ready", () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(error);

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "❌ Error executing command.",
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: "❌ Error executing command.",
        ephemeral: true
      });
    }
  }
});

// ===== STARTUP SEQUENCE =====
(async () => {
  await connectMongo();
  await registerCommands();
  await client.login(TOKEN);
})();
