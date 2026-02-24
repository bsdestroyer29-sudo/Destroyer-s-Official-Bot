import mongoose from "mongoose";

const TicketClaimSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true },
    ticketChannelId: { type: String, required: true, unique: true },

    claimedById: { type: String, default: null },
    claimedRoleId: { type: String, default: null },

    claimedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export default mongoose.model("TicketClaim", TicketClaimSchema);