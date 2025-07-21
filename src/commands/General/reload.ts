import type { SlashCommandProps } from 'commandkit'

/** @type {import('commandkit').CommandData}  */
export const data = {
    name: 'reload',
    description: 'Reload the bot'
}

/**
 * @param {import('commandkit').SlashCommandProps} param0 
 */
export const run = async ({ interaction, client, handler }: SlashCommandProps) => {
    interaction.deferReply().catch(console.error);

    try {
            await handler.reloadCommands();
            await handler.reloadEvents();
            await interaction.editReply({
                content: 'Commands and events have been reloaded successfully.'
            });
        
    } catch (error) {
        console.error('Error reloading commands or events:', error);
        await interaction.editReply({
            content: 'An error occurred while reloading commands or events.'
        });
    }
}

/** @type {import('commandkit').CommandOptions} */
export const options = {
    // https://commandkit.js.org/typedef/CommandOptions
    devOnly: true,
}