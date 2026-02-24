import mongoose from "mongoose";

const InviteSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  inviterId: { type: String, required: true },

  invites: { type: Number, default: 0 },
  fakeInvites: { type: Number, default: 0 },
  leaves: { type: Number, default: 0 },

  invitedUsers: [{ type: String }]
});

// 🔒 Prevent duplicate inviter per guild
InviteSchema.index({ guildId: 1, inviterId: 1 }, { unique: true });

export default mongoose.model("Invite", InviteSchema);