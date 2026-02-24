import mongoose from "mongoose";

const ApplicationSessionSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  answers: [{ question: String, answer: String }],
  currentQuestion: { type: Number, default: 0 },
  completed: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model("ApplicationSession", ApplicationSessionSchema);