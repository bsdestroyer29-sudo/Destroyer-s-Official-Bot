import mongoose from "mongoose";

const WarningSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  moderatorId: String,
  reason: String,
  date: { type: Date, default: Date.now }
});

export default mongoose.model("Warning", WarningSchema);