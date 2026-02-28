import mongoose from "mongoose";

const CountingStateSchema = new mongoose.Schema({
  guildId: String,
  currentCount: { type: Number, default: 0 },
  lastUserId: { type: String, default: null },
  highestCount: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model("CountingState", CountingStateSchema);
