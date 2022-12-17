import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../types";
import { TRPCClient } from "../trpcclient";

export const command: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName("link")
        .setDescription("Link your Granblue Account to your Discord Account.")
        .addStringOption((option) =>
            option.setName("gbf_id").setDescription("Your Granblue ID").setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        const response = await TRPCClient.user.createUser.mutate({
            discordId: interaction.user.id,
            gbfId: interaction.options.getString("gbf_id") ?? "",
        });

        if (response) {
            await interaction.reply("Linked your account!");
        } else {
            await interaction.reply("Failed to link your account!");
        }
    },
};
