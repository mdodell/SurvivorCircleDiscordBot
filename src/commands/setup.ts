import { Discord, SimpleCommand, SimpleCommandMessage } from "discordx";
import PlayerModel from "../models/player.js";
import { getPlayers } from "../utils/userUtils.js";

@Discord()
export class Setup {
  @SimpleCommand("import-players")
  async importPlayers(command: SimpleCommandMessage) {
    const players = await getPlayers(command);

    players?.forEach(
      async (player) =>
        await PlayerModel.create({
          name: player.user.username,
          discordId: player.id,
        })
          .then(() =>
            command.message.reply(
              `${player.user.username} was successfully imported into the database!`
            )
          )
          .catch((e) =>
            command.message.reply(
              `There was an error importing ${player.user.username} into the database: ${e}!`
            )
          )
    );
  }
}
