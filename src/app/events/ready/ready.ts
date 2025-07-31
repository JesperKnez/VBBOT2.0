import { Client } from "discord.js";
import mongoose from 'mongoose'; // Import the default mongoose instance
import { REST, Routes } from 'discord.js';

const rest = new REST().setToken(process.env.DISCORD_TOKEN || '');


/** * @param {import('discord.js').Client} client */
export default async function (client: Client<true>){
    console.log(`${client?.user?.username} is online!`);

    // Delete all existing commands
    console.log('Deleting all existing commands...');
    await rest.put(Routes.applicationCommands(client.user.id), {
        body: []
    })

        // Set up event listeners BEFORE connecting
    mongoose.connection.on('connected', () => {
        console.log('Connected to MongoDB successfully!');
    });

    mongoose.connection.on('error', (err: any) => {
        console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
        console.log('Disconnected from MongoDB');
    });

    try {
        await mongoose.connect(process.env.MONGO_CONNECTION_STRING || '', {
        serverSelectionTimeoutMS: 10000, // Timeout after 10 seconds
        });
        console.log('MongoDB connection initiated');

    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
    }
}