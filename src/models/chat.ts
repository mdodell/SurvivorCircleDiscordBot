import mongoose from "mongoose";

export interface Chat {
  isOpen: boolean;
  players: string[];
  channelId: string;
  isReadOnly: boolean;
}

const schema = new mongoose.Schema<Chat>({
  isOpen: { type: Boolean, required: true, default: true },
  players: [{ type: String, required: true }],
  channelId: { type: String, required: true },
  isReadOnly: { type: Boolean, required: false },
});

const ChatModel = mongoose.model<Chat>("Chat", schema);

export default ChatModel;
