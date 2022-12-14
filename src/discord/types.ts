import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

export type SlashCommand = {
    data: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
    execute: (interaction: ChatInputCommandInteraction) => void | Promise<void>;
};

export type SlashCommandFile = {
    command: SlashCommand;
};
