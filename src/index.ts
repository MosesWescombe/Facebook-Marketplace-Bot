import { EmbedBuilder } from "discord.js";
import { client } from "./bot/bot";
import { Browser, DetailedListing, Listing } from "./scraper/browser";
const config = require('./bot/config.json');

async function main() {
    console.log("Running")

    const browser = new Browser();

    // Set initial listing list
    await browser.getListings();
    await new Promise(resolve => setTimeout(resolve, 5000));

    while (true) {
        const new_listings: Listing[] = await browser.getListings();
        
        const detailed_listings: DetailedListing[] = []
        for (const listing of new_listings) {
            const details = await browser.getDetails(listing);
            details && detailed_listings.push(details);
        }

        console.log("New Listings:", detailed_listings);

        for (const listing of detailed_listings) {
            const channel_id = '1236112685410684999';
            const channel = client.channels.cache.get(channel_id);

            const embed = new EmbedBuilder()
                .setTitle(listing.title)
                .setURL(listing.url)
                .setImage(listing.image)
                .setTimestamp()
                .addFields(
                    {
                        name: 'Price',
                        value: listing.price,
                        inline: true
                    },
                    {
                        name: 'Kms',
                        value: listing.kms,
                        inline: true
                    }
                )

            if (channel?.isTextBased()) {
                await channel.send({embeds: [embed]});
            }
        }

        const randomDelay = Math.floor(Math.random() * 20000) + 35000; // Generate a random delay between 15-25 seconds (in milliseconds)
        await new Promise(resolve => setTimeout(resolve, randomDelay));
    }
}

// Start the bot
client.login(config.token);
main();