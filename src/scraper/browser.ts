import { Builder, By, WebDriver, WebElement } from 'selenium-webdriver';

export type Listing = {
    id: string;
    url: string;
}

export type DetailedListing = Listing & {
    title: string;
    price: string;
    kms: string;
    image: string;
}

export class Browser {
    private driver: WebDriver;
    private listings: Listing[] = [];

    constructor() {
        this.driver = new Builder().forBrowser('chrome').build();
    }
    
    waitForPageToLoad = async () => {
        await this.driver.wait(async () => {
            const readyState = await this.driver.executeScript('return document.readyState');
            return readyState === 'complete';
        }, 10000);
        
        await this.driver.sleep(4000);
    }
    
    getListings = async (): Promise<Listing[]> => {
        try {
            await this.driver.get('https://www.facebook.com/marketplace/christchurch/search?query=vehicle&minPrice=3000&maxPrice=20000&sortBy=creation_time_descend&exact=false');
            await this.waitForPageToLoad();
            
            // Find all anchor elements with href starting with '/marketplace/item/'
            const anchorElements = await this.driver.findElements(By.css('a[href^="/marketplace/item/"]'));
            
            // Extract href content from anchor elements
            const hrefs = await Promise.all(anchorElements.map(async (element) => {
                return await element.getAttribute('href');
            }));
            
            const found_listings = hrefs.map((href) => {
                return {
                    id: href.split('/')[5],
                    url: href
                }
            });
            
            // Add new listings to the list
            const new_listings = found_listings.filter((listing) => !this.listings.find((l) => l.id === listing.id));
            
            if (new_listings.length === 0) {
                new_listings.push(found_listings[Math.floor(Math.random() * found_listings.length)]);
            }
            
            this.listings.push(...new_listings);
            return new_listings;
        } catch (error) {
            console.error('Error getting listings:', error);
            return [];
        }
    }
    
    getDetails = async (listing: Listing): Promise<DetailedListing | null> => {
        try {
            
            await this.driver.get(listing.url);
            await this.waitForPageToLoad();
            
            const titleElement = (await this.driver.getTitle());
            const bodyText = await this.driver.findElement(By.css('body')).getText();
            
            // Title between the junk
            let title: string;
            if (titleElement.startsWith('Marketplace')) {
                title = titleElement.split('–')[1]?.trim() || 'Title not found';
            } else {
                title = titleElement.split('–')[0]?.trim() || 'Title not found';
            }
            
            // Regex to find the price format "NZ$ followed by numbers"
            const priceRegex = /NZ\$\d{1,3}(?:[,.]\d{3})*(?:\.\d+)?/g;
            const price_matches = bodyText.match(priceRegex);
            
            // Get the kms if exists
            const regex = /\b\d{1,3}(?:,\d{3})*\s?(km|kms|ks|k)\b/gi; // 'i' for case insensitive, 'g' for global
            const km_matches = bodyText.match(regex);
            let kms = km_matches ? km_matches[0].trim() : 'Kms not found';
            if (kms === '64 km') {
                kms = 'Kms not found'
            }
            
            // Find image
            const images: WebElement[] = await this.driver.findElements(By.css('img[alt^="Product photo of"]'));
            const img_src: string = await images[0].getAttribute('src') ?? 'Image not found';
            
            return {
                ...listing,
                title,
                kms,
                price: price_matches ? price_matches[0].trim() : 'Price not found',
                image: img_src
            };
        } catch (error) {
            console.error('Error getting details:', error);
            return null;
        }
    }
}