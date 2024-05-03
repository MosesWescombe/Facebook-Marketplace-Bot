import { Browser, DetailedListing, Listing } from "./scraper/browser";

async function main() {
    console.log("Running")

    const browser = new Browser();

    // Set initial listing list
    const initial_listings = await browser.getListings();
    console.log("Initial Listings:", initial_listings);
    await new Promise(resolve => setTimeout(resolve, 5000));

    while (true) {
        const new_listings: Listing[] = await browser.getListings();
        
        const detailed_listings: DetailedListing[] = []
        for (const listing of new_listings) {
            const details = await browser.getDetails(listing);
            details && detailed_listings.push(details);
        }

        console.log("New Listings:", detailed_listings);

        const randomDelay = Math.floor(Math.random() * 20000) + 35000; // Generate a random delay between 15-25 seconds (in milliseconds)
        await new Promise(resolve => setTimeout(resolve, randomDelay));
    }
}

main();