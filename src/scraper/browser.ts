import { Builder, By, WebDriver, WebElement } from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome';

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

    constructor() {
        // Headless mode
        this.driver = new Builder().setChromeOptions(new Options().addArguments('--headless=new')).build();

        // Non-headless mode
        // this.driver = new Builder().forBrowser('chrome').build();
    }
    
    waitForPageToLoad = async () => {
        await this.driver.wait(async () => {
            const readyState = await this.driver.executeScript('return document.readyState');
            return readyState === 'complete';
        }, 10000);
        
        await this.driver.sleep(4000);
    }
    
    getListings = async (search: string, existingListings: string[]): Promise<Listing[]> => {
        try {
            await this.driver.get(search);
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
            const new_listings = found_listings.filter((listing) => !existingListings.includes(listing.id));
            
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

            // Click ignore button
            const ignoreButton = await this.driver.findElement(By.css('[aria-label="Close"]'));
            if (ignoreButton) {
                await ignoreButton.click();
            }

            // Click read more button
            const readMoreButton = await this.driver.findElement(By.xpath('//span[text()="See more"]/ancestor::*[@role="button"][1]'));
            
            if (readMoreButton) {
                await readMoreButton.click();
                // Wait 1s
                await this.driver.sleep(1000);
            }
            
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
            const regex = /\b\d{1,3}(?:[,. ]?(?:\d{3}|xxx))*\s?(km|kms|ks|k|klms)\b/gi; // 'i' for case insensitive, 'g' for global
            const km_matches = bodyText.match(regex);
            let kms = km_matches ? km_matches[0].trim() : 'Not found';
            if (kms === '64 km') {
                kms = 'Kms not found'
            }
            
            // Find image
            const images: WebElement[] = await this.driver.findElements(By.css('img[alt^="Product photo of"]'));
            const img_src: string = await images[0]?.getAttribute('src') ?? 'Image not found';
            
            return {
                ...listing,
                title,
                kms,
                price: price_matches ? price_matches[0].trim() : 'Not found',
                image: img_src
            };
        } catch (error) {
            console.error('Error getting details:', error);
            return null;
        }
    }
}