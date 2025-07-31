import { ActionRowBuilder, ModalBuilder, TextInputBuilder } from '@discordjs/builders';
import type { ChatInputCommandContext, AutocompleteCommandContext } from 'commandkit'
import { ActionRow, SlashCommandBuilder, TextInputStyle } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();


/** @type {import('commandkit').CommandData}  */
export const command = {
    ...new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Bekijk spelerprofielen!')
        // .addStringOption(option =>
        //     option.setName('player')
        //         .setDescription('De gebruiker waarvan je het profiel wilt bekijken')
        //         .setRequired(true)
        //         .setAutocomplete(true)
        .toJSON()
    ,
    guilds: [process.env.DEVELOPMENT_GUILD_ID]
};
// )

export const chatInput = async ({ interaction, client }: ChatInputCommandContext) => {
    interaction.reply({
        content: 'Deze command is nog in ontwikkeling. Kom later terug!',
    });
}

// export function autocomplete({ interaction, client }: AutocompleteCommandContext) {
//     const focusedValue = interaction.options.getFocused();
//     console.log(focusedValue);
//
//     const results: any = users;
//
//     interaction.respond(results);
// }
//
// /** @type {import('commandkit').CommandOptions} */
// export const options = {
//     // https://commandkit.js.org/typedef/CommandOptions
//     guildOnly: true,
//     devOnly: true,
//     deleted: false
// }