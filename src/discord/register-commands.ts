import { REST, Routes } from "discord.js";
import { slashCommands } from "./commands";
import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/../.env" });

void (async () => {
    if (process.env.DISCORD_TOKEN === undefined) throw new Error("DISCORD_TOKEN is undefined");
    if (process.env.CLIENT_ID === undefined) throw new Error("CLIENT_ID is undefined");

    const commands = slashCommands.map((file) => file.data.toJSON());
    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

    const data = (await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.DEV_GUILD_ID ?? ""),
        { body: commands }
    )) as unknown[];

    console.log(`Successfully reloaded ${data.length} application commands.`);
})();
