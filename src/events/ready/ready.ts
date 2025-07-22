import { CommandKit } from "commandkit";
import { Client } from "discord.js";
import ConfigModel from "../../schemas/Config";
import mongoose from 'mongoose'; // Import the default mongoose instance

/** * @param {import('discord.js').Client} client */
export default async function (c: Client<true>, client: Client<true>, handler: CommandKit){
    console.log(`${client?.user?.tag} is online!`);
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