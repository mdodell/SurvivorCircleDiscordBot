import { SimpleCommandMessage } from "discordx";

export const isHost = (command: SimpleCommandMessage) =>
  !!command.message.member?.roles.cache.find((role) => role.name === "Host");

export const isPlayer = (command: SimpleCommandMessage) =>
  !!command.message.member?.roles.cache.find((role) => role.name === "Player");

export const getPlayers = async (command: SimpleCommandMessage) => {
  const guild = command.message.guild;
  // Need to fetch all members of the server
  await guild?.members.fetch();

  // Get everyone with the 'Player' role
  const roles = await guild?.roles.fetch();

  const players = await roles?.find((r) => r.name === "Player")?.members;
  return players;
};
