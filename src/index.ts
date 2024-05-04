import { REST, Routes } from "discord.js";
import { client, sendListingMessage } from "./bot/bot";
import { dbManager } from "./db";
import { Browser, DetailedListing, Listing } from "./scraper/browser";
import path from "path";
import * as fs from 'fs';
const config = require('./bot/config.json');

const searchChannelListings = new Map<string, string[]>();
const fetchedSearches: string[] = [];

async function updateCommands(rest: REST, guildId: string) {
    const commands = [];
    // Grab all the command folders from the commands directory you created earlier
    const foldersPath = path.join(__dirname, './bot/commands');
    const commandFiles = fs.readdirSync(foldersPath).filter(file => file.endsWith('.js'));
    // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
    for (const file of commandFiles) {
        const filePath = path.join(foldersPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }

    try {
        console.log(`Started refreshing application ${guildId} (/) commands.`);

        await rest.put(
            Routes.applicationGuildCommands(config.clientId, guildId),
            { body: commands },
        );

        console.log(`Successfully reloaded application ${guildId} (/) commands.`);
    } catch (error) {
        console.error(error);
    }
}

class Runner {
    private browser: Browser;

    constructor() {
        this.browser = new Browser();
    }

    async setup() {
        console.log("Starting...")

        // Start the bot
        client.login(config.token);

        // Fetch all search channels
        const searchChannels = await dbManager.getSearchChannels();

        // Refresh commands
        const rest = new REST({ version: '9' }).setToken(config.token);

        // Setup
        for (const channel of searchChannels) {
            await updateCommands(rest, channel.guildId);

            for (const search of channel.searches) {
                const existing_listings = await this.browser.getListings(search, []);
                searchChannelListings.set(channel.channelId, [...searchChannelListings.get(channel.channelId) || [], ...existing_listings.map(listing => listing.id)]);
                fetchedSearches.push(search);
            }
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    async main() {
        await this.setup();

        console.log("Running...")

        // Main thread
        while (true) {
            const searchChannels = await dbManager.getSearchChannels();

            // Go through each channel
            for (const channel of searchChannels) {
                // Get all new listings
                const new_listings: Listing[] = [];
                for (const search of channel.searches) {
                    // Do initial fetch for any new searches
                    if (!fetchedSearches.includes(search)) {
                        const existing_listings = await this.browser.getListings(search, []);
                        searchChannelListings.set(channel.channelId, [...searchChannelListings.get(channel.channelId) || [], ...existing_listings.map(listing => listing.id)]);
                        fetchedSearches.push(search);
                    }

                    // Fetch new listings
                    const existing_listings = searchChannelListings.get(channel.channelId) || [];
                    new_listings.push(...await this.browser.getListings(search, existing_listings));
                    searchChannelListings.set(channel.channelId, [...existing_listings, ...new_listings.map(listing => listing.id)]);
                }

                // Get details
                const detailed_listings: DetailedListing[] = []
                for (const listing of new_listings) {
                    const details = await this.browser.getDetails(listing);
                    details && detailed_listings.push(details);
                }

                if (detailed_listings.length > 0) {
                    console.log(`New Listings ${detailed_listings.length}`)
                }

                for (const listing of detailed_listings) {
                    await sendListingMessage(listing, channel.channelId)
                }

                const randomDelay = Math.floor(Math.random() * 20000) + 35000; // Generate a random delay between 15-25 seconds (in milliseconds)
                await new Promise(resolve => setTimeout(resolve, randomDelay));
            }
        }
    }

}

new Runner().main();