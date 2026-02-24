import mongoose from "mongoose";

const TicketQueueSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true },
    queueChannelId: { type: String, required: true },
    queueMessageId: { type: String, default: null }
  },
  { timestamps: true }
);

export default mongoose.model("TicketQueue", TicketQueueSchema);