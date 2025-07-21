import { ActionRowBuilder, ModalBuilder, TextInputBuilder } from '@discordjs/builders';
import type { SlashCommandProps } from 'commandkit'
import { TextInputStyle } from 'discord.js';
import dotenv from 'dotenv';
import UserModel from '../../schemas/User';
import { parse, isValid, isPast, format } from 'date-fns';
dotenv.config();

/** @type {import('commandkit').CommandData}  */
export const data = {
    name: 'birthday',
    description: 'Stel je verjaardag in',
}

/**
 * @param {import('commandkit').SlashCommandProps} param0 
 */
export const run = async ({ interaction, client, handler }: SlashCommandProps) => {

    const modal = new ModalBuilder()
        .setCustomId('birthdayModal')
        .setTitle('Stel je verjaardag in');

    const birthdayInput = new TextInputBuilder()
        .setCustomId('birthdayInput')
        .setLabel('Vul je verjaardag in')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('DD-MM-YYYY');

    const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(birthdayInput);

    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);

    // Wait for the modal submit interaction
    interaction.awaitModalSubmit({
        filter: i => i.customId === 'birthdayModal' && i.user.id === interaction.user.id,
        time: 60000 // 1 minute timeout
    }).then(async modalInteraction => {
        await modalInteraction.deferReply();
        let birthday: any = modalInteraction.fields.getTextInputValue('birthdayInput');
        birthday = parse(birthday, 'dd-MM-yyyy', new Date());

        // Validate the birthday input
        if (!isValid(birthday) || !isPast(birthday)) {
            await modalInteraction.editReply({
                content: 'Ongeldige datum. Zorg ervoor dat je een geldige verjaardag invoert in het formaat DD-MM-YYYY en dat deze in de toekomst ligt.',
            });
            return;
        }

        
        try{
            // If the verification is succesful, i want to store this in my MongoDB database. There is a userschema which defines a user. Inside there is an array of Clash accounts, since the user can have multiple Clash accounts connected to the bot.
            const user = await client.users.fetch(modalInteraction.user.id);

            // If the user does not exist in the database, create a new user. Otherwise, update the existing user by adding the new Clash account. 
            let dbUser = await UserModel.findOne({ discordId: user.id });
            if (!dbUser) {
                dbUser = new UserModel({
                    discordId: user.id,
                    userName: user.username,
                    displayName: user.displayName,
                    birthday: birthday,
                    clashAccounts: []
                });
            } else {
                dbUser.birthday = birthday;
            }


            // Save the user to the database
            await dbUser.save();

            await modalInteraction.editReply({
                content: `Je verjaardag is succesvol ingesteld op ${format(birthday, 'dd-MM-yyyy')}.`,
            });

        } catch(error){
            console.error(error);
            await modalInteraction.editReply({
                content: 'Er is een fout opgetreden bij het instellen van je verjaardag. Probeer het opnieuw.',
            });
        }
    }).catch(err => {
        console.error('Modal submit interaction failed:', err);
        interaction.followUp({
            content: 'Er is een fout opgetreden bij het instellen van je verjaardag. Probeer het opnieuw.',
            ephemeral: true
        });
    });
}

/** @type {import('commandkit').CommandOptions} */
export const options = {
    // https://commandkit.js.org/typedef/CommandOptions
    guildOnly: true,
    devOnly: true,
    deleted: false
}