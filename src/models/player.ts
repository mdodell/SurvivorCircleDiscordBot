import mongoose from "mongoose";

interface Player {
  name: string;
  discordId: string;
  privateChatNumber: number;
  groupChatNumber: number;
}

const schema = new mongoose.Schema<Player>({
  name: { type: String, required: true },
  discordId: { type: String, required: true },
  privateChatNumber: { type: Number, required: true, default: 0 },
  groupChatNumber: { type: Number, required: true, default: 0 },
});

const PlayerModel = mongoose.model<Player>("Player", schema);

export default PlayerModel;
