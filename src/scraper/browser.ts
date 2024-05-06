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
        this.driver = new Builder().setChromeOptions(new Options().addArguments('--headless=new', '--no-sandbox', '--disable-dev-shm-usage')).build();

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

            try {
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
            } catch(e) {
                console.log('No read more button found');
            }
            // Find description element
            const descriptionElement = await this.driver.findElement(By.css('[data-testid="marketplace_pdp_summary"]'));

            // Get description text
            const descriptionText = await descriptionElement.getText();

            // Find seller name element
            const sellerNameElement = await this.driver.findElement(By.css('[data-testid="marketplace_pdp_seller_name"]'));

            // Get seller name
            const sellerName = await sellerNameElement.getText();

            return {
                ...listing,
                description: descriptionText,
                seller: sellerName
            };
            // Find image element
            const imageElement = await this.driver.findElement(By.css('[data-testid="marketplace_pdp_image"]'));

            // Get image source
            const img_src = await imageElement.getAttribute('src');

            return {
                ...listing,
                description: descriptionText,
                seller: sellerName,
                image: img_src
            };
        } catch (error) {
            console.error('Error getting details:', error);
            return null;
        }
    }
}