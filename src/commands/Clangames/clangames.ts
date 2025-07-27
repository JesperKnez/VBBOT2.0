/** @type {import('commandkit').CommandData}  */
import { SlashCommandProps } from "commandkit";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Client, ComponentType, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import ClangameModel from '../../schemas/Clangames';
import ConfigModel from '../../schemas/Config';
import { ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { format } from "date-fns";

// Function to get clan choices from config
async function getClanChoices() {
    try {
        const config = await ConfigModel.findOne();
        if (!config || !config.clanList || config.clanList.length === 0) {
            // Fallback to default clans if no config found
            return [
                { name: "Vechtersbazen!", value: "#PYPQYPYR" },
                { name: "Jong v'bazen!", value: "#2Y8JPYQ89" }
            ];
        }
        
        return config.clanList.map(clan => ({
            name: clan.name,
            value: clan.tag
        }));
    } catch (error) {
        console.error('Error fetching clan choices:', error);
        // Fallback to default clans
        return [
            { name: "Vechtersbazen!", value: "#PYPQYPYR" },
            { name: "Jong v'bazen!", value: "#2Y8JPYQ89" }
        ];
    }
}

export const data = new SlashCommandBuilder()
    .setName('clangames')
    .setDescription('Beheer clangames')
    .addSubcommand(subcommand =>
        subcommand
            .setName('init')
            .setDescription('Initialiseer de clangame tracking')
            .addStringOption(option =>
                option
                    .setName('clan')
                    .setDescription('Selecteer een clan')
                    .setRequired(true)
                    .setChoices(
                        { name: "Vechtersbazen!", value: "#PYPQYPYR" },
                        { name: "Jong v'bazen!", value: "#2Y8JPYQ89" }
                    )
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('poll')
            .setDescription('Bekijk de huidige staat van de clangames.')
            .addStringOption(option =>
                option
                    .setName('clan')
                    .setDescription('Selecteer een clan')
                    .setRequired(true)
                    .setChoices(
                        { name: "Vechtersbazen!", value: "#PYPQYPYR" },
                        { name: "Jong v'bazen!", value: "#2Y8JPYQ89" }
                    )
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('current')
            .setDescription('Bekijk de huidige clangame status.')
            .addStringOption(option =>
                option
                    .setName('clan')
                    .setDescription('Selecteer een clan')
                    .setRequired(true)
                    .setChoices(
                        { name: "Vechtersbazen!", value: "#PYPQYPYR" },
                        { name: "Jong v'bazen!", value: "#2Y8JPYQ89" }
                    )
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('leaderboard')
            .setDescription('Bekijk de clangame leaderboard.')
            .addStringOption(option =>
                option
                    .setName('clan')
                    .setDescription('Selecteer een clan')
                    .setRequired(true)
                    .setChoices(
                        { name: "Vechtersbazen!", value: "#PYPQYPYR" },
                        { name: "Jong v'bazen!", value: "#2Y8JPYQ89" }
                    )
            )
    );

export const run = async ({ interaction, client, handler }: SlashCommandProps) => {
    // Handle the subcommands
    const subcommand = interaction.options.getSubcommand();
    const selectedClan = interaction.options.getString('clan', true);

    switch (subcommand) {
        case 'init':
            await initializeClangames(interaction, client, selectedClan);
            break;
        case 'poll':
            await pollClangames(interaction, client, selectedClan);
            break;
        case 'current':
            await getCurrentClangames(interaction, client, selectedClan);
            break;
        case 'leaderboard':
            await getClangameLeaderboard(interaction, client, selectedClan);
    }
    return;
}

async function initializeClangames(interaction: ChatInputCommandInteraction, client: Client, clanTag: string) {
    await interaction.deferReply();

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
        await interaction.editReply({
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
        await interaction.editReply({
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

    await interaction.editReply({
        content: `Clangames voor clan met tag ${clanTag} zijn succesvol geïnitialiseerd!`
    });
}

async function pollClangames(interaction: ChatInputCommandInteraction, client: Client, clanTag: string) {
    await interaction.deferReply();

    // Just find the existing clangame, don't reset it
    const clangame = await ClangameModel.findOne({ clanTag: clanTag });

    if (!clangame) {
        await interaction.editReply({
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
        await interaction.editReply({
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

    await interaction.editReply({
        content: `Clangames voor clan met tag ${clanTag} zijn succesvol gepolled!`
    });
}

async function getCurrentClangames(interaction: ChatInputCommandInteraction, client: Client, clanTag: string) {
    await interaction.deferReply();

    // Just find the existing clangame, don't reset it
    const clangame = await ClangameModel.findOne({ clanTag: clanTag });

    if (!clangame) {
        await interaction.editReply({
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

    await interaction.editReply({
        embeds: [embed]
    });
}

async function getClangameLeaderboard(interaction: ChatInputCommandInteraction, client: Client, clanTag: string) {
    await interaction.deferReply();

    // Just find the existing clangame, don't reset it
    const clangame = await ClangameModel.findOne({ clanTag: clanTag });

    if (!clangame) {
        await interaction.editReply({
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

    const response = await interaction.editReply({
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
                await interaction.editReply({
                    components: [disabledButtons]
                });
            } catch (error) {
                // Ignore errors if message was already deleted
            }
        });
    }
}


/** @type {import('commandkit').CommandOptions} */
export const options = {
    // https://commandkit.js.org/typedef/CommandOptions
    guildOnly: true,
    devOnly: true,
    deleted: false
}