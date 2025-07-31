/** @type {import('commandkit').CommandData}  */
import { ChatInputCommandContext } from "commandkit";
import { SlashCommandBuilder } from "discord.js";

export const command = {...new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Measure the bot\'s latency')
    .toJSON(),
    guilds: [process.env.DEVELOPMENT_GUILD_ID] // Add your guild IDs here
};

export const chatInput = async ({ interaction, client }: ChatInputCommandContext) => {
    await interaction.deferReply();
    await interaction.editReply(`Ping! Latency is ${client.ws.ping}ms`);
}

/** @type {import('commandkit').CommandOptions} */
export const options = {
    // https://commandkit.js.org/typedef/CommandOptions
    deleted: false
}