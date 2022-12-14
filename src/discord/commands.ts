import path from "path";
import fs from "fs";
import { SlashCommandFile } from "./types";

const isJsOrTsFile = (file: string) => file.endsWith(".ts") || file.endsWith(".js");

export const slashCommands = fs
    .readdirSync(path.resolve(__dirname, "./commands"))
    .filter(isJsOrTsFile)
    .map((file) => {
        const { command } =
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            require(`./commands/${file}`) as SlashCommandFile;
        return command;
    });
