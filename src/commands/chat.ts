import { Role, TextChannel } from "discord.js";
import {
  Discord,
  SimpleCommand,
  SimpleCommandMessage,
  SimpleCommandOption,
} from "discordx";

const ONE_ONE_CHAT_CATEGORY = "919023378088738916";
const GROUP_CATEGORY = "919023425182396446";
const EVERYONE = "918702698495365201";

@Discord()
export class Chat {
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
      command.message.guild?.channels.cache.get(channelId)?.setName(newName);
    }
  }

  @SimpleCommand("chat", { argSplitter: "," })
  async openChat(
    @SimpleCommandOption("user1", { type: "STRING" }) user1: string | undefined,
    command: SimpleCommandMessage
  ) {
    const guild = command.message.guild;

    const roles = await guild?.roles.fetch();

    const players = roles?.find((r) => r.name === "Player")?.members;

    const spectatorRole = roles?.find((r) => r.name === "Spectator");

    const invitedPlayers = players?.filter(
      (player) => player.user.username === user1
    );

    const messageSender = command.message.member?.user;

    if (messageSender) {
      const channel = guild?.channels
        .create(`${messageSender.username}-${user1}`, {
          parent: ONE_ONE_CHAT_CATEGORY,
          type: "GUILD_TEXT",
        })
        .then((r) => {
          r.permissionOverwrites.create(EVERYONE, {
            VIEW_CHANNEL: false,
          });

          r.permissionOverwrites.create(spectatorRole as Role, {
            VIEW_CHANNEL: true,
          });

          invitedPlayers?.forEach((player) => {
            r.permissionOverwrites.create(player, {
              VIEW_CHANNEL: true,
            });
          });
        });
    }
  }
}
