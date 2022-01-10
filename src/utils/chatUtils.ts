import {
  TextChannel,
  Collection,
  Role,
  GuildMember,
  PermissionString,
} from "discord.js";

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
  const filteredUsers = [
    ...new Set(users.filter(Boolean).map((name) => name?.toLowerCase())),
  ];
  const guild = command.message.guild;

  // Need to fetch all members of the server
  await guild?.members.fetch();

  // Get everyone with the 'Player' role
  const roles = await guild?.roles.fetch();
  const players = roles?.find((r) => r.name === "Player")?.members;

  // Get everyone with the 'Spectator' role
  const spectatorRole = roles?.find((r) => r.name === "Spectator");

  const playerRole = roles?.find((r) => r.name === "Player");

  const invitedPlayers = players?.filter(
    (player) =>
      filteredUsers.includes((player.nickname as string)?.toLowerCase()) ||
      filteredUsers.includes(player.user.username.toLowerCase())
  ) as Collection<string, GuildMember>;

  const invitedPlayerNames = invitedPlayers?.map((player) => ({
    nickname: player.nickname?.toLowerCase(),
    username: player.user.username.toLowerCase(),
    id: player.user.id,
  }));

  // If there wasn't a found player with a name
  const usersNotFound = filteredUsers
    .map((user) => {
      const invitedUsernames = invitedPlayerNames.map((player) =>
        player.username.toLowerCase()
      );

      const invitedNicknames = invitedPlayerNames.map((player) =>
        player.nickname?.toLowerCase()
      );

      const notInvited =
        !invitedUsernames?.includes(user as string) &&
        !invitedNicknames.includes(user as string);
      return notInvited && user;
    })
    .filter(Boolean);

  if (usersNotFound.length > 0) {
    command.message.reply(
      `We were unable to invite ${usersNotFound.join(
        ", "
      )} so the chat will not be made. Try again please!`
    );
    return;
  }

  if (invitedPlayers?.size === 0) {
    command.message.reply(
      "Sorry, we couldn't find any of the players you invited!"
    );
    return;
  } else {
    const messageSender = command.message.member;

    if (messageSender) {
      const playersInChat = [
        command.message.author.id,
        ...invitedPlayers.map((player) => player.id),
      ];

      const potentialChat = await ChatModel.findOne({
        $and: [
          { players: { $all: playersInChat } },
          { players: { $size: playersInChat.length } },
        ],
      });

      // If the chat doesn't already exist
      if (!potentialChat) {
        const channelName = `${
          messageSender.nickname || messageSender.user.username
        }-${invitedPlayers
          ?.map((m) => m.nickname || m.user.username)
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
              SEND_MESSAGES: false,
            });

            channel.permissionOverwrites.create(spectatorRole as Role, {
              VIEW_CHANNEL: true,
              SEND_MESSAGES: false,
            });

            // Make it so players cannot see the channel
            channel.permissionOverwrites.create(playerRole as Role, {
              VIEW_CHANNEL: false,
            });

            // However, then invite the players who were added into the channel
            invitedPlayers?.forEach((player) => {
              channel.permissionOverwrites.create(player, {
                VIEW_CHANNEL: true,
                SEND_MESSAGES: true,
              });
            });

            channel.send(
              `${command.message.author.toString()} opened a chat with ${invitedPlayers
                .map((player) => player.user.toString())
                .join(", ")}.`
            );

            ChatModel.create({
              channelId: channel.id,
              players: playersInChat,
              isOpen: true,
              isReadOnly: null,
            });

            command.message.reply(
              `Created the <#${channel.id}> chat with ${invitedPlayerNames
                .map((playerName) => `<@${playerName.id}>`)
                .join(", ")!}`
            );
          });
      } else if (potentialChat.isOpen) {
        // If the chat is already open
        command.message.reply(
          `You already have a chat with ${invitedPlayers.map(
            (player) => `<@${player.id}>`
          )}: <#${potentialChat.channelId}>!`
        );
      } else if (!potentialChat.isOpen) {
        // Reopen the chat with permissions
        const channel = guild?.channels.cache.get(
          potentialChat.channelId
        ) as TextChannel;

        invitedPlayers?.forEach((player) => {
          channel?.permissionOverwrites.edit(player, {
            VIEW_CHANNEL: true,
            SEND_MESSAGES: true,
          });
        });

        channel.send(
          `${command.message.author.toString()} reopened the <#${
            channel.id
          }> with ${invitedPlayers
            .map((player) => player.user.toString())
            .join(", ")}.`
        );

        await potentialChat.updateOne({
          isOpen: true,
        });

        command.message.reply(
          `Reopened the <#${channel.id}> chat with ${invitedPlayerNames
            ?.map((player) => `<@${player.id}>`)
            .join(", ")!}`
        );
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
      if ((open && chat.isReadOnly) || (!open && chat.isReadOnly === false)) {
        command.message.reply(
          `The <#${chat.channelId}> chat is already ${
            chat.isReadOnly ? "open" : "closed"
          }`
        );
      } else {
        const discordChat = command.message.guild?.channels.cache.get(
          chat.channelId
        ) as TextChannel;

        await ChatModel.updateOne(
          {
            channelId: chat.channelId,
          },
          {
            isReadOnly: open,
          }
        );

        chat.players.forEach(async (player) => {
          const user = await command.message.guild?.members.fetch(player);
          discordChat.permissionOverwrites.edit(user as GuildMember, {
            SEND_MESSAGES: open,
          });
        });

        discordChat.send(
          `<#${chat.channelId}> is now ${open ? "open" : "closed"}!`
        );
      }
    });
  } else {
    command.message.reply("You must be a host to run this command.");
  }
};
