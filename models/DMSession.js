import mongoose from "mongoose";

const DMSessionSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  staffId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("DMSession", DMSessionSchema);