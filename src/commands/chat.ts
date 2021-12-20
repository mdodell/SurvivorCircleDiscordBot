import { Collection, GuildMember, Role, TextChannel } from "discord.js";
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
    @SimpleCommandOption("user2", { type: "STRING" }) user2: string | undefined,
    @SimpleCommandOption("user3", { type: "STRING" }) user3: string | undefined,
    @SimpleCommandOption("user4", { type: "STRING" }) user4: string | undefined,
    command: SimpleCommandMessage
  ) {
    if (!user1) {
      command.message.reply("You must include at least one user to chat with!");
      return;
    }
    const guild = command.message.guild;

    // Need to fetch all members of the server
    await guild?.members.fetch();

    const users = [user1, user2, user3, user4].filter(Boolean);

    // Get everyone with the 'Player' role
    const roles = await guild?.roles.fetch();
    const players = roles?.find((r) => r.name === "Player")?.members;

    // Get everyone with the 'Spectator' role
    const spectatorRole = roles?.find((r) => r.name === "Spectator");

    const invitedPlayers = players?.filter((player) =>
      users.includes(player.user.username)
    ) as Collection<string, GuildMember>;

    const invitedPlayerNames = invitedPlayers?.map(
      (player) => player.user.username
    );

    // If there wasn't a found player with a name
    const usersNotFound = users
      .map((user) => {
        const notInvited = !invitedPlayerNames?.includes(user as string);
        return notInvited && user;
      })
      .filter(Boolean);

    if (usersNotFound.length > 0) {
      command.message.reply(
        `We were unable to invite ${usersNotFound.join(", ")}`
      );
    }

    if (invitedPlayers?.size === 0) {
      command.message.reply(
        "Sorry, we couldn't find any of the players you invited!"
      );
      return;
    } else {
      const messageSender = command.message.member?.user;

      if (messageSender) {
        const channel = guild?.channels
          .create(
            `${messageSender.username}-${invitedPlayers
              ?.map((m) => m.user.username)
              .join("-")}`,
            {
              parent:
                invitedPlayers?.size === 1
                  ? ONE_ONE_CHAT_CATEGORY
                  : GROUP_CATEGORY,
              type: "GUILD_TEXT",
            }
          )
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

        command.message.reply(
          `Created a chat with ${invitedPlayerNames
            ?.filter((playerName) => !usersNotFound.includes(playerName))
            .join(", ")!}`
        );
      }
    }
  }
}
