import mongoose from "mongoose";

const ApplicationSessionSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  panelMessageId: String,

  currentQuestion: { type: Number, default: 0 },
  answers: [
    {
      question: String,
      answer: String
    }
  ],

  completed: { type: Boolean, default: false },
  submitted: { type: Boolean, default: false },
  reviewed: { type: Boolean, default: false },
  waitingForSubmit: { type: Boolean, default: false }

}, { timestamps: true });

// ✅ Unique index - database physically prevents duplicate active sessions
ApplicationSessionSchema.index(
  { userId: 1, panelMessageId: 1, submitted: 1, reviewed: 1 },
  {
    unique: true,
    partialFilterExpression: {
      submitted: false,
      reviewed: false
    }
  }
);

export default mongoose.model("ApplicationSession", ApplicationSessionSchema);