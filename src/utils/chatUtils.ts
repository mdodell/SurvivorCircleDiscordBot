import { TextChannel, Collection, Role, GuildMember } from "discord.js";

import { SimpleCommandMessage } from "discordx";
import {
  EVERYONE,
  GROUP_CATEGORY,
  ONE_ONE_CHAT_CATEGORY,
} from "../constants/categories.js";
import { isHost } from "./userUtils.js";
import ChatModel from "../models/chat.js";

export const openChat = async (
  command: SimpleCommandMessage,
  users: (string | undefined)[]
) => {
  const guild = command.message.guild;

  // Need to fetch all members of the server
  await guild?.members.fetch();

  // Get everyone with the 'Player' role
  const roles = await guild?.roles.fetch();
  const players = roles?.find((r) => r.name === "Player")?.members;

  // Get everyone with the 'Spectator' role
  const spectatorRole = roles?.find((r) => r.name === "Spectator");

  const playerRole = roles?.find((r) => r.name === "Player");

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
      const playersInChat = [
        command.message.author.id,
        ...invitedPlayers.map((player) => player.id),
      ];

      const potentialChat = await ChatModel.findOne({
        players: {
          $all: playersInChat,
        },
      });

      // If the chat doesn't already exist
      if (!potentialChat) {
        const channelName = `${messageSender.username}-${invitedPlayers
          ?.map((m) => m.user.username)
          .join("-")}`;

        await guild?.channels
          .create(channelName, {
            parent:
              invitedPlayers?.size === 1
                ? ONE_ONE_CHAT_CATEGORY
                : GROUP_CATEGORY,
            type: "GUILD_TEXT",
          })
          .then((channel) => {
            channel.permissionOverwrites.create(EVERYONE, {
              VIEW_CHANNEL: false,
            });

            channel.permissionOverwrites.create(spectatorRole as Role, {
              VIEW_CHANNEL: true,
            });

            // Make it so players cannot see the channel
            channel.permissionOverwrites.create(playerRole as Role, {
              VIEW_CHANNEL: false,
            });

            // However, then invite the players who were added into the channel
            invitedPlayers?.forEach((player) => {
              channel.permissionOverwrites.create(player, {
                VIEW_CHANNEL: true,
              });
            });

            channel.send(
              `${command.message.author.toString()} opened a chat with ${invitedPlayers
                .map((player) => player.user.toString())
                .join(", ")}.`
            );

            ChatModel.create({
              name: channelName,
              channelId: channel.id,
              players: playersInChat,
              isOpen: true,
            });

            command.message.reply(
              `Created the <#${channel.id}> chat with ${invitedPlayerNames
                ?.filter((playerName) => !usersNotFound.includes(playerName))
                .join(", ")!}`
            );
          });
      } else if (potentialChat.isOpen) {
        // If the chat is already open
        command.message.reply(
          `You already have a chat with ${invitedPlayerNames}: <#${potentialChat.channelId}>!`
        );
      } else if (!potentialChat.isOpen) {
        // Reopen the chat with permissions
        // guild?.channels.fetch(potentialChat.channelId).then(channel => {
        //   channel?.permissionOverwrites.edit({})
        // };
      }
    }
  }
};

// Checks if the person doing the command is a host.
// If they are, it will either open or close all messages from
// being sent in a ONE_ON_ONE chat or a GROUP chat
export const updateChatReadOnlyMode = async (
  command: SimpleCommandMessage,
  open: boolean
) => {
  if (isHost(command)) {
    const playerChats = await ChatModel.find({});

    playerChats.forEach(async (chat) => {
      if ((open && chat.isOpen) || (!open && !chat.isOpen)) {
        command.message.reply(
          `The <#${chat.channelId}> chat is already ${open ? "open" : "closed"}`
        );
      } else {
        const discordChat = command.message.guild?.channels.cache.get(
          chat.channelId
        );

        await ChatModel.findOneAndUpdate(
          {
            channelId: chat.channelId,
          },
          {
            isReadOnly: open,
          }
        );

        (discordChat as TextChannel).permissionOverwrites
          .edit(EVERYONE, {
            SEND_MESSAGES: open,
          })
          .then(() =>
            (discordChat as TextChannel).send(
              `<#${chat.channelId}> is now ${open ? "open" : "closed"}!`
            )
          );
      }
    });
  } else {
    command.message.reply("You must be a host to run this command.");
  }
};
