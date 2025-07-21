/** @type {import('commandkit').CommandData}  */
import { SlashCommandProps } from "commandkit";
import { type CommandInteraction } from "discord.js";
export const data = {
    name: 'ping',
    description: 'Measure the bot\'s latency',
}

/**
 * @param {import('commandkit').SlashCommandProps} param0 
 */
export const run = async ({ interaction, client, handler }: SlashCommandProps) => {
    await interaction.reply(`Ping! Latency is ${client.ws.ping}ms`);
}

/** @type {import('commandkit').CommandOptions} */
export const options = {
    // https://commandkit.js.org/typedef/CommandOptions
    guildOnly: true,
    devOnly: true,
    deleted: false
}