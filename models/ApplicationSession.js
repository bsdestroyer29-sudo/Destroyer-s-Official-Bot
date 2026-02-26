import mongoose from "mongoose";

const ApplicationSessionSchema = new mongoose.Schema({
  guildId: String,
  userId: String,
  panelMessageId: String,

  currentQuestion: {
    type: Number,
    default: 0
  },

  answers: [
    {
      question: String,
      answer: String
    }
  ],

  completed: {
    type: Boolean,
    default: false
  },

  submitted: {
    type: Boolean,
    default: false
  },

  reviewed: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

export default mongoose.model("ApplicationSession", ApplicationSessionSchema);