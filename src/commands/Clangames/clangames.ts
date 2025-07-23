/** @type {import('commandkit').CommandData}  */
import { SlashCommandProps } from "commandkit";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Client, ComponentType, Embed, EmbedBuilder, SlashCommandBuilder, StringSelectMenuBuilder } from "discord.js";
import ClangameModel from '../../schemas/Clangames';
import { ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { format, getUnixTime } from "date-fns";
import fastChunkString from "@shelf/fast-chunk-string";
export const data = new SlashCommandBuilder()
    .setName('clangames')
    .setDescription('Beheer clangames')
    .addSubcommand(subcommand =>
        subcommand
            .setName('init')
            .setDescription('Initialiseer de clangame tracking')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('poll')
            .setDescription('Bekijk de huidige staat van de clangames.')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('current')
            .setDescription('Bekijk de huidige clangame status.')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('leaderboard')
            .setDescription('Bekijk de clangame leaderboard.')
    );
/**
 * @param {import('commandkit').SlashCommandProps} param0 
*/
export const run = async ({ interaction, client, handler }: SlashCommandProps) => {

    // Handle the subcommands
    const subcommand = interaction.options.getSubcommand();


    switch (subcommand) {
        case 'init':
            await initializeClangames(interaction, client);
            break;

        case 'poll':
            await pollClangames(interaction, client);
            break;
        case 'current':
            await getCurrentClangames(interaction, client);
            break;
        case 'leaderboard':
            await getClangameLeaderboard(interaction, client);
    }
    return;
}


async function initializeClangames(interaction: ChatInputCommandInteraction, client: Client) {

    // Here you would typically check if the clan exists and initialize the clangame tracking
    const modal = new ModalBuilder()
        .setCustomId(interaction.id)
        .setTitle('Vul clantag in');

    const clanTagInput = new TextInputBuilder()
        .setCustomId('clanTagInput')
        .setLabel('Vul je Clash of Clans clantag in')
        .setStyle(TextInputStyle.Short)

    const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(clanTagInput);

    modal.addComponents(firstActionRow);
    await interaction.showModal(modal);

    // Wait for the modal submit interaction
    interaction.awaitModalSubmit({
        filter: i => i.customId === interaction.id && i.user.id === interaction.user.id,
        time: 60000 // 1 minute timeout
    }).then(async modalInteraction => {
        await modalInteraction.deferReply();
        const clanTag = modalInteraction.fields.getTextInputValue('clanTagInput');

        const clangame = await ClangameModel.findOneAndUpdate(
            { clanTag: clanTag },
            {
                clanTag: clanTag,
                month: format(new Date(), 'MMM-yyyy'),
                members: [],
                totalClanScore: 0
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        );

        if (!clangame) {
            await modalInteraction.editReply({
                content: 'Er is een fout opgetreden bij het initialiseren van de clangames.'
            });
            return;
        }

        // Get all the members of the clan.
        const members = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(clanTag)}/members`, {
            headers: {
                Authorization: `Bearer ${process.env.COC_API_KEY}`
            }
        }).then(res => res.json());

        if (!members || !members.items) {
            await modalInteraction.editReply({
                content: 'Er is een fout opgetreden bij het ophalen van de clanleden.'
            });
            return;
        }

        const detailedMembers = await Promise.all(members.items.map(async (member: any) => {
            const playerTag = member.tag;

            // Fetch the player's current score
            const playerData = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(playerTag)}`, {
                headers: {
                    Authorization: `Bearer ${process.env.COC_API_KEY}`
                }
            }).then(res => res.json());

            return {
                playerTag: playerTag,
                playerName: member.name,
                startingScore: playerData.achievements.find((a: any) => a.name === 'Games Champion')?.value || 0,
            }
        }));

        // Update the clangame with the members
        clangame.members.push(...detailedMembers);

        // Save the changes to the database
        await clangame.save();

        await modalInteraction.editReply({
            content: `Clangames voor clan met tag ${clanTag} zijn succesvol geïnitialiseerd!`
        });
    }).catch(err => {
        console.error('Error handling modal submit:', err);
        interaction.editReply({
            content: 'Er is een fout opgetreden bij het initialiseren van de clangames.'
        });
    });
}

async function pollClangames(interaction: ChatInputCommandInteraction, client: Client) {

    // Here you would typically check if the clan exists and initialize the clangame tracking
    const modal = new ModalBuilder()
        .setCustomId(interaction.id)
        .setTitle('Vul clantag in');

    const clanTagInput = new TextInputBuilder()
        .setCustomId('clanTagInput')
        .setLabel('Vul je Clash of Clans clantag in')
        .setStyle(TextInputStyle.Short)

    const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(clanTagInput);

    modal.addComponents(firstActionRow);
    await interaction.showModal(modal);

    // Wait for the modal submit interaction
    interaction.awaitModalSubmit({
        filter: i => i.customId === interaction.id && i.user.id === interaction.user.id,
        time: 60000 // 1 minute timeout
    }).then(async modalInteraction => {
        await modalInteraction.deferReply();
        const clanTag = modalInteraction.fields.getTextInputValue('clanTagInput');

        // Just find the existing clangame, don't reset it
        const clangame = await ClangameModel.findOne({ clanTag: clanTag });

        if (!clangame) {
            await modalInteraction.editReply({
                content: 'Geen clangame gevonden voor deze clan. Voer eerst /clangames init uit.'
            });
            return;
        }

        // Get all the members of the clan.
        const members = await fetch(`https://api.clashofclans.com/v1/clans/${encodeURIComponent(clanTag)}/members`, {
            headers: {
                Authorization: `Bearer ${process.env.COC_API_KEY}`
            }
        }).then(res => res.json());

        if (!members || !members.items) {
            await modalInteraction.editReply({
                content: 'Er is een fout opgetreden bij het ophalen van de clanleden.'
            });
            return;
        }

        // Update existing members with their ending scores
        await Promise.all(members.items.map(async (member: any) => {
            const playerTag = member.tag;

            // Find the existing member in the clangame
            const existingMember = clangame.members.find(m => m.playerTag === playerTag);

            if (existingMember) {
                // Fetch the player's current score
                const playerData = await fetch(`https://api.clashofclans.com/v1/players/${encodeURIComponent(playerTag)}`, {
                    headers: {
                        Authorization: `Bearer ${process.env.COC_API_KEY}`
                    }
                }).then(res => res.json());

                // Update only the ending score, preserve the starting score. Set totalScore based on the difference
                existingMember.endingScore = playerData.achievements.find((a: any) => a.name === 'Games Champion')?.value || 0;
                existingMember.totalScore = Math.min(existingMember.endingScore - existingMember.startingScore, 4000);
            }
        }));

        // Calculate the total clan score
        clangame.totalClanScore = clangame.members.reduce((total, member) => total + member.totalScore, 0);

        // Save the changes to the database
        await clangame.save();

        await modalInteraction.editReply({
            content: `Clangames voor clan met tag ${clanTag} zijn succesvol gepolled!`
        });
    }).catch(err => {
        console.error('Error handling modal submit:', err);
        interaction.editReply({
            content: 'Er is een fout opgetreden bij het pollen van de clangames.'
        });
    });
}

async function getCurrentClangames(interaction: ChatInputCommandInteraction, client: Client) {

    // Here you would typically check if the clan exists and initialize the clangame tracking
    const modal = new ModalBuilder()
        .setCustomId(interaction.id)
        .setTitle('Vul clantag in');

    const clanTagInput = new TextInputBuilder()
        .setCustomId('clanTagInput')
        .setLabel('Vul je Clash of Clans clantag in')
        .setStyle(TextInputStyle.Short)

    const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(clanTagInput);

    modal.addComponents(firstActionRow);
    await interaction.showModal(modal);

    // Wait for the modal submit interaction
    interaction.awaitModalSubmit({
        filter: i => i.customId === interaction.id && i.user.id === interaction.user.id,
        time: 60000 // 1 minute timeout
    }).then(async modalInteraction => {
        await modalInteraction.deferReply();
        const clanTag = modalInteraction.fields.getTextInputValue('clanTagInput');

        // Just find the existing clangame, don't reset it
        const clangame = await ClangameModel.findOne({ clanTag: clanTag });

        if (!clangame) {
            await modalInteraction.editReply({
                content: 'Geen clangame gevonden voor deze clan. Voer eerst /clangames init uit.'
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`Huidige Clangames voor ${clangame.clanTag}`)
            .addFields(
                { name: 'Totaal Clan Score', value: clangame.totalClanScore.toString(), inline: true },
                { name: 'Aantal Leden', value: clangame.members.length.toString(), inline: true }
            )
            .setColor('#109431')
            .setTimestamp();

        await modalInteraction.editReply({
            embeds: [embed]
        });
    }).catch(err => {
        console.error('Error handling modal submit:', err);
        interaction.editReply({
            content: 'Er is een fout opgetreden bij het pollen van de clangames.'
        });
    });
}

async function getClangameLeaderboard(interaction: ChatInputCommandInteraction, client: Client) {
    // Here you would typically check if the clan exists and initialize the clangame tracking
    const modal = new ModalBuilder()
        .setCustomId(interaction.id)
        .setTitle('Vul clantag in');

    const clanTagInput = new TextInputBuilder()
        .setCustomId('clanTagInput')
        .setLabel('Vul je Clash of Clans clantag in')
        .setStyle(TextInputStyle.Short);

    const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(clanTagInput);

    modal.addComponents(firstActionRow);
    await interaction.showModal(modal);

    // Wait for the modal submit interaction
    interaction.awaitModalSubmit({
        filter: i => i.customId === interaction.id && i.user.id === interaction.user.id,
        time: 60000 // 1 minute timeout
    }).then(async modalInteraction => {
        await modalInteraction.deferReply();
        const clanTag = modalInteraction.fields.getTextInputValue('clanTagInput');

        // Just find the existing clangame, don't reset it
        const clangame = await ClangameModel.findOne({ clanTag: clanTag });

        if (!clangame) {
            await modalInteraction.editReply({
                content: 'Geen clangame gevonden voor deze clan. Voer eerst /clangames init uit.'
            });
            return;
        }

        // Sort members by totalScore
        const sortedMembers = clangame.members.sort((a, b) => b.totalScore - a.totalScore);

        const leaderboardLines = sortedMembers.map((member, index) => {
            if (index === 0) {
                return `${index + 1}. <:coc_star:1397600540854194367><:coc_star:1397600540854194367><:coc_star:1397600540854194367> ${member.playerName} - Score: ${member.totalScore}`;
            } else if (index === 1) {
                return `${index + 1}. <:coc_star:1397600540854194367><:coc_star:1397600540854194367><:coc_starempty:1397599212287557765> ${member.playerName} - Score: ${member.totalScore}`;
            } else if (index === 2) {
                return `${index + 1}. <:coc_star:1397600540854194367><:coc_starempty:1397599212287557765><:coc_starempty:1397599212287557765> ${member.playerName} - Score: ${member.totalScore}`;
            } else {
                return `${index + 1}. <:coc_starempty:1397599212287557765><:coc_starempty:1397599212287557765><:coc_starempty:1397599212287557765> ${member.playerName} - Score: ${member.totalScore}`;
            }
        });

        // Chunk by lines instead of characters to preserve emoji formatting
        const chunkLines = (lines: string[], maxLength: number = 3000): string[][] => {
            const chunks: string[][] = [];
            let currentChunk: string[] = [];
            let currentLength = 0;

            for (const line of lines) {
                const lineLength = line.length + 1; // +1 for newline character
                
                if (currentLength + lineLength > maxLength && currentChunk.length > 0) {
                    chunks.push([...currentChunk]);
                    currentChunk = [line];
                    currentLength = lineLength;
                } else {
                    currentChunk.push(line);
                    currentLength += lineLength;
                }
            }

            if (currentChunk.length > 0) {
                chunks.push(currentChunk);
            }

            return chunks;
        };

        const leaderboardChunks = chunkLines(leaderboardLines);
        const leaderboardContent = leaderboardChunks.map(chunk => chunk.join('\n'));
        
        let currentPage = 0;
        const totalPages = leaderboardContent.length;

        const createEmbed = (page: number) => {
            return new EmbedBuilder()
                .setTitle(`Clangame Leaderboard voor ${clangame.clanTag}`)
                .setDescription(leaderboardContent[page] || 'Geen leden gevonden.')
                .setColor('#109431')
                .setFooter({ text: `Pagina ${page + 1} van ${totalPages} | Totaal Clan Score: ${clangame.totalClanScore}` })
                .setTimestamp();
        };

        const createButtons = (page: number) => {
            const row = new ActionRowBuilder<ButtonBuilder>();
            
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`prev+${interaction.id}`)
                    .setLabel('◀️ Vorige')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId(`next+${interaction.id}`)
                    .setLabel('Volgende ▶️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(page === totalPages - 1)
            );

            return row;
        };

        // Send initial embed
        const initialEmbed = createEmbed(currentPage);
        const initialButtons = createButtons(currentPage);

        const response = await modalInteraction.editReply({
            embeds: [initialEmbed],
            components: totalPages > 1 ? [initialButtons] : []
        });

        // Only add button collector if there are multiple pages
        if (totalPages > 1) {
            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 300000, // 5 minutes
                filter: i => i.user.id === interaction.user.id
            });

            collector.on('collect', async (buttonInteraction) => {
                if (buttonInteraction.customId === `prev+${interaction.id}` && currentPage > 0) {
                    currentPage--;
                } else if (buttonInteraction.customId === `next+${interaction.id}` && currentPage < totalPages - 1) {
                    currentPage++;
                }

                const newEmbed = createEmbed(currentPage);
                const newButtons = createButtons(currentPage);

                await buttonInteraction.update({
                    embeds: [newEmbed],
                    components: [newButtons]
                });
            });

            collector.on('end', async () => {
                // Disable buttons when collector expires
                const disabledButtons = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('prev')
                            .setLabel('◀️ Vorige')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('next')
                            .setLabel('Volgende ▶️')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    );

                try {
                    await modalInteraction.editReply({
                        components: [disabledButtons]
                    });
                } catch (error) {
                    // Ignore errors if message was already deleted
                }
            });
        }

    }).catch(err => {
        console.error('Error handling modal submit:', err);
        interaction.editReply({
            content: 'Er is een fout opgetreden bij het ophalen van de clangame leaderboard.'
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