import { TextChannel } from "discord.js";
import {
  Discord,
  SimpleCommand,
  SimpleCommandMessage,
  SimpleCommandOption,
} from "discordx";
import {
  GROUP_CATEGORY,
  ONE_ONE_CHAT_CATEGORY,
} from "../constants/categories.js";
import ChatModel from "../models/chat.js";
import { openChat, updateChatReadOnlyMode } from "../utils/chatUtils.js";
import { withinChatHours } from "../utils/time.js";
import { isHost, isPlayer } from "../utils/userUtils.js";

@Discord()
export class Chat {
  // This command will rename the chat.
  @SimpleCommand("rename")
  async renameChat(
    @SimpleCommandOption("new-name", { type: "STRING" })
    newName: string | undefined,
    command: SimpleCommandMessage
  ) {
    const channel = command.message.channel as TextChannel;
    if (!newName) {
      command.message.reply("You need to include a new name for the channel!");
    } else if (
      // Not a 1:1 chat or a group chat
      channel?.parent?.id !== ONE_ONE_CHAT_CATEGORY &&
      channel?.parent?.id !== GROUP_CATEGORY
    ) {
      command.message.reply("You cannot rename this channel!");
    } else {
      const channelId = command.message.channelId;
      await ChatModel.findOneAndUpdate(
        {
          channelId: channelId,
        },
        {
          name: newName,
        }
      );
      command.message.guild?.channels.cache.get(channelId)?.setName(newName);
    }
  }

  // This command will make all chats read-only if the user is an admin.
  @SimpleCommand("close")
  async closeChat(command: SimpleCommandMessage) {
    updateChatReadOnlyMode(command, false);
  }

  @SimpleCommand("open")
  async openChats(command: SimpleCommandMessage) {
    updateChatReadOnlyMode(command, true);
  }

  // This command will open up both private and group chats.
  @SimpleCommand("chat", { argSplitter: "," })
  async openChat(
    @SimpleCommandOption("user1", { type: "STRING" }) user1: string | undefined,
    @SimpleCommandOption("user2", { type: "STRING" }) user2: string | undefined,
    @SimpleCommandOption("user3", { type: "STRING" }) user3: string | undefined,
    @SimpleCommandOption("user4", { type: "STRING" }) user4: string | undefined,
    command: SimpleCommandMessage
  ) {
    // if (!withinChatHours() || !isPlayer(command) || !isHost(command)) {
    //   command.message.reply(
    //     "You cannot open a chat between the hours of 8 AM EST to 11 PM EST."
    //   );
    //   return;
    // }
    if (!user1) {
      command.message.reply("You must include at least one user to chat with!");
      return;
    }

    openChat(command, [user1, user2, user3, user4]);
  }
}
