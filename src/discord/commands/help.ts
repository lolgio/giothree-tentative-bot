import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../types";

export const command: SlashCommand = {
    data: new SlashCommandBuilder().setName("help").setDescription("Get help with the bot"),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.reply({ content: "Help is on the way!", ephemeral: true });
    },
};
