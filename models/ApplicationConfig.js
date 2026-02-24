import mongoose from "mongoose";

const ApplicationConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  panelChannelId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  questions: [{ type: String }],
  isOpen: { type: Boolean, default: true }
});

export default mongoose.model("ApplicationConfig", ApplicationConfigSchema);