import mongoose from "mongoose";

interface Player {
  name: string;
  discordId: string;
}

const schema = new mongoose.Schema<Player>({
  name: { type: String, required: true },
  discordId: { type: String, required: true },
});

const PlayerModel = mongoose.model<Player>("Player", schema);

export default PlayerModel;
