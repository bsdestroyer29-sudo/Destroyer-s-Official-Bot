import mongoose from "mongoose";

const InviteSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  code: { type: String, required: true },
  inviterId: { type: String, required: true },
  uses: { type: Number, default: 0 }
});

export default mongoose.model("Invite", InviteSchema);