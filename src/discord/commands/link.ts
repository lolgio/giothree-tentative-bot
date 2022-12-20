import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../types";
import { t } from "../trpcclient";
import { TRPCClientError } from "@trpc/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";

export const command: SlashCommand = {
    data: new SlashCommandBuilder()
        .setName("link")
        .setDescription("Link your Granblue Account to your Discord Account.")
        .addStringOption((option) =>
            option.setName("gbf_id").setDescription("Your Granblue ID").setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        try {
            await interaction.deferReply({ ephemeral: true });
            await t.user.createUser.mutate({
                discordId: interaction.user.id,
                gbfId: interaction.options.getString("gbf_id") ?? "",
            });
            await interaction.editReply("Successfully linked your account!");
        } catch (err) {
            if (err instanceof TRPCClientError) {
                if (err.cause instanceof PrismaClientKnownRequestError && err.meta) {
                    const target: string[] = err.meta.target as string[];
                    if (target.includes("discordId")) {
                        await interaction.editReply(
                            "Your Discord account already has a GBF Account Linked!\nUse /unlink first."
                        );
                    } else {
                        await interaction.editReply(
                            "The GBF ID is already linked to another Discord account!"
                        );
                    }
                    return;
                }
                await interaction.editReply(err.message);
            }
        }
    },
};
