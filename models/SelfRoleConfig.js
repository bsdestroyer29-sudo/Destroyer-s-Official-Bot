import mongoose from "mongoose";

const SelfRoleConfigSchema = new mongoose.Schema({
  guildId: String,
  panelChannelId: String,
  panelMessageId: String,
  title: String,
  description: String,
  roles: [
    {
      roleId: String,
      label: String,
      description: String
    }
  ]
}, { timestamps: true });

export default mongoose.model("SelfRoleConfig", SelfRoleConfigSchema);
