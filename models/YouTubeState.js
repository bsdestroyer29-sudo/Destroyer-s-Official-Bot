import mongoose from "mongoose";

const YouTubeStateSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },

  youtubeChannelId: { type: String, required: true },
  announceChannelId: { type: String, required: true },
  pingRoleId: { type: String, required: true },

  lastVideoId: { type: String, default: "" },
  lastVideoUrl: { type: String, default: "" },
  lastPublishedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model("YouTubeState", YouTubeStateSchema);
