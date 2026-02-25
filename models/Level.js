import mongoose from "mongoose";

const LevelSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },

  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 }
}, { timestamps: true });

LevelSchema.index({ guildId: 1, userId: 1 }, { unique: true });

export default mongoose.model("Level", LevelSchema);
