import mongoose from "mongoose";

const ApplicationConfigSchema = new mongoose.Schema({
  guildId: String,
  panelChannelId: String,
  panelMessageId: String,

  title: String,
  description: String,

  questions: [String],

  isOpen: { type: Boolean, default: true }

}, { timestamps: true });

export default mongoose.model("ApplicationConfig", ApplicationConfigSchema);