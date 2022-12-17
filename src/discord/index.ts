import { Client, Events, GatewayIntentBits, Partials } from "discord.js";
import { slashCommands } from "./commands";
import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/../../.env" });

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.once(Events.ClientReady, (c) => {
    console.log(`Logged in as ${c.user?.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const cmd = slashCommands.find((c) => c.data.name === interaction.commandName);

        if (!cmd) {
            console.log("Unknown command");
            return;
        }
        await cmd.execute(interaction);
    }
});

void (async () => {
    await client.login(DISCORD_TOKEN);
})();
