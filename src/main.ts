import "reflect-metadata";
import {
  Intents,
  Interaction,
  Message,
  Role,
  TextChannel,
  User,
} from "discord.js";
import { Client } from "discordx";
import { dirname, importx } from "@discordx/importer";
import * as dotenv from "dotenv";
import cron from "node-cron";
import mongoose, { ConnectOptions } from "mongoose";
import ChatModel, { Chat } from "./models/chat.js";
import { SERVER_ID, ALERTS_CHANNEl } from "./constants/categories.js";
import PlayerModel from "./models/player.js";
dotenv.config();

const client = new Client({
  simpleCommand: {
    prefix: "!",
  },
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
  // If you only want to use global commands only, comment this line
  botGuilds: [(client) => client.guilds.cache.map((guild) => guild.id)],
  silent: true,
});

client.once("ready", async () => {
  // make sure all guilds are in cache
  await client.guilds.fetch();

  // init all application commands
  await client.initApplicationCommands({
    guild: { log: true },
    global: { log: true },
  });

  // init permissions; enabled log to see changes
  await client.initApplicationPermissions(true);

  // uncomment this line to clear all guild commands,
  // useful when moving to global commands from guild commands
  //  await client.clearApplicationCommands(
  //    ...client.guilds.cache.map((g) => g.id)
  //  );

  console.log("Bot started");

  cron.schedule(
    "0 23 * * 1-5",
    async () => {
      const playerChats: Chat[] = await ChatModel.find({
        isOpen: true,
      });

      // Update chats and close them all for the users that are in the chats
      await ChatModel.updateMany(
        {
          isOpen: true,
        },
        {
          isOpen: false,
          // Reset the read only state as well
          isReadOnly: null,
        },
        async () => {
          playerChats.forEach(async ({ channelId, players }) => {
            const channel: TextChannel = client.channels.cache.get(
              channelId
            ) as TextChannel;

            (client.channels.cache.get(channelId) as TextChannel).send(
              `<#${channelId}> is now closed!`
            );

            players.forEach(async (player) => {
              const user = client.users.cache.get(player);

              channel.permissionOverwrites.edit(user as User, {
                VIEW_CHANNEL: false,
                SEND_MESSAGES: false,
              });
            });
          });
        }
      );
    },
    {
      timezone: "America/New_York",
    }
  );

  cron.schedule(
    "0 8 * * 1-5",
    async () => {
      const guild = client.guilds.cache.get(SERVER_ID);
      const roles = await guild?.roles.fetch();

      const playerRole = roles?.find((r) => r.name === "Player");

      const players = playerRole?.members;
      if (players) {
        players.forEach(async (player) => {
          await PlayerModel.findOneAndUpdate(
            {
              id: player.id,
            },
            {
              privateChatNumber: 0,
              groupChatNumber: 0,
            }
          );
        });
      }

      const channel = guild?.channels.cache.get(ALERTS_CHANNEl) as TextChannel;

      channel.send(`${playerRole}, chats can now be opened!`);
    },
    {
      timezone: "America/New_York",
    }
  );
});

client.on("interactionCreate", (interaction: Interaction) => {
  client.executeInteraction(interaction);
});

client.on("messageCreate", (message: Message) => {
  client.executeCommand(message);
});

async function run() {
  // with cjs
  // await importx(__dirname + "/{events,commands}/**/*.{ts,js}");
  // with ems
  await importx(dirname(import.meta.url) + "/{events,commands}/**/*.{ts,js}");

  mongoose
    .connect(process.env.DATABASE_URL!, {
      keepAlive: true,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as ConnectOptions)
    .then(() => console.log("Connected to database!"))
    .catch((e) => console.log(e));
  client.login(process.env.BOT_TOKEN ?? ""); // provide your bot token
}

run();
