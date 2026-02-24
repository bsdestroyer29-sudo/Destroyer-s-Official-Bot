import mongoose from "mongoose";

const InviteSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  inviterId: { type: String, required: true },

  invites: { type: Number, default: 0 },
  fakeInvites: { type: Number, default: 0 },
  leaves: { type: Number, default: 0 },

  invitedUsers: [{ type: String }]
});

export default mongoose.model("Invite", InviteSchema);