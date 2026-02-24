import mongoose from "mongoose";

const DMSessionSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true, unique: true },

  staffId: { type: String, required: true },

  logChannelId: { type: String, required: true },

  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("DMSession", DMSessionSchema);