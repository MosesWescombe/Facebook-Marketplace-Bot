import axios from 'axios';
import { Builder, By, WebDriver, WebElement } from 'selenium-webdriver';
import { Options } from 'selenium-webdriver/chrome';
import { config } from '../constants';

export type Listing = {
    id: string;
    url: string;
}

export type DetailedListing = Listing & {
    title: string;
    price: string;
    kms: string;
    image: string;
    plate: string | null;
    price_details: {
        low: number;
        high: number;
        average: number;
    } | null;
}

async function getPlateDetails(img_url: string) {
    try {
        const options = new FormData();
        options.append('upload_url', img_url);
        const response = await axios.post('https://api.platerecognizer.com/v1/plate-reader/?', options, {
            headers: {
                'Authorization': `Token ${config.plateRecognizerToken}`,
            }
        });

        if (response.status === 201) {
            console.log("Results", response.data.results)

            if (response.data.results.length > 0) {
                return response.data.results[0].plate;
            }
        }

        return null;
    } catch (e) {
        console.log(e)
        return null;
    }
}

async function getTradeMeDetails(plate: string) {
    try {
        const response = await axios.get(`https://api.trademe.co.nz/v1/motors/valuation/car/${plate.toUpperCase()}/0.json`, {
            headers: {
                'Authorization': `Bearer ${config.trademeToken}`,
                'Newrelic': 'eyJ2IjpbMCwxXSwiZCI6eyJ0eSI6IkJyb3dzZXIiLCJhYyI6IjQzODYzOCIsImFwIjoiMzgwMDc2Nzg0IiwiaWQiOiI5NzQ1NTgwNjRkNTc1YjIxIiwidHIiOiI5YjRlMGIyYzIxY2E4OTVmZWUyZTU4ZjQ1YzE1MWJiMCIsInRpIjoxNzE1NDg2Mzc0ODE1fX0=',
                'Origin': 'https://www.trademe.co.nz',
                'Referer': 'https://www.trademe.co.nz/',
            }
        });

        if (response.status === 200) {
            return response.data.Valuation;
        }

        console.log(response.data);
        return null;
    } catch (e) {
        console.log(e)
        return null;
    }
}

export class Browser {
    private driver: WebDriver;

    constructor() {
        // Headless mode
        // this.driver = new Builder().setChromeOptions(new Options().addArguments('--headless=new', '--no-sandbox', '--disable-dev-shm-usage')).build();

        // Non-headless mode
        this.driver = new Builder().forBrowser('chrome').build();
    }

    closeLoginPopup = async () => {
            // Get contents of the page
            try {
                // Click ignore button
                const ignoreButton = await this.driver.findElement(By.css('[aria-label="Close"]'));
                if (ignoreButton) {
                    await ignoreButton.click();
                }
            } catch(e) {
                console.log('Cannot close popup');
            }
    }
    
    waitForPageToLoad = async () => {
        await this.driver.wait(async () => {
            const readyState = await this.driver.executeScript('return document.readyState');
            return readyState === 'complete';
        }, 10000);
        
        await this.driver.sleep(2000);
    }
    
    getListings = async (search: string, existingListings: string[]): Promise<Listing[]> => {
        try {
            await this.driver.get(search);
            await this.waitForPageToLoad();
            await this.closeLoginPopup();
            
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
            
            // if (new_listings.length > 1) {
            //     return [found_listings[1]];
            // }

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
            await this.closeLoginPopup();

            // Get contents of the page
            try {
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

            // Find all the images
            const photos: string[] = [];
            try {
                const imageButton = await this.driver.findElement(By.css('div[aria-label="View next image"]'));

                let attempts = 0
                while (attempts < 10) {
                    // Find image
                    const images: WebElement[] = await this.driver.findElements(By.css('img[alt^="Product photo of"]'));
                    const img_src: string | null = await images[0]?.getAttribute('src') ?? null;

                    // Check if image is already in the list
                    if (img_src && !photos.includes(img_src)) {
                        photos.push(img_src);                        
                    } else {
                        break;
                    }

                    await imageButton.click();
                }
            } catch(e) {
                console.log('No images found');
            }

            // Get Plate
            let plate = null;
            // for (const photo of photos) {
            //     const response = await getPlateDetails(photo);
            //     if (response) {
            //         plate = response;
            //         break;
            //     }
            //     // Wait 1s (to avoid rate limiting)
            //     await this.driver.sleep(1000);
            // }
            
            const titleElement = (await this.driver.getTitle());
            const bodyText = await this.driver.findElement(By.css('body')).getText();
            
            // Regex to find the price format "NZ$ followed by numbers"
            const priceRegex = /NZ\$\d{1,3}(?:[,.]\d{3})*(?:\.\d+)?/g;
            const price_matches = bodyText.match(priceRegex);
            const price = price_matches ? price_matches[0].trim() : 'Not found';
            
            // const trademeDetails = plate ? await getTradeMeDetails(plate) : null;
            // if (trademeDetails) {
            //     console.log('TradeMe details:', trademeDetails);
            //     return {
            //         ...listing,
            //         price,
            //         plate,
            //         image: photos[0] ?? 'No image found',
            //         title: `${trademeDetails.Make} ${trademeDetails.Model} ${trademeDetails.Year}`,
            //         kms: trademeDetails.Odometer,
            //         price_details: {
            //             low: trademeDetails.Low,
            //             high: trademeDetails.High,
            //             average: trademeDetails.Average
            //         }
            //     };
            // }

            // Title between the junk
            let title: string;
            if (titleElement.startsWith('Marketplace')) {
                title = titleElement.split('–')[1]?.trim() || 'Title not found';
            } else {
                title = titleElement.split('–')[0]?.trim() || 'Title not found';
            }
            
            // Get the kms if exists
            const regex = /\b\d{1,3}(?:[,. ]?(?:\d{3}|xxx))*\s?(km|kms|ks|k|klms)\b/gi; // 'i' for case insensitive, 'g' for global
            const km_matches = bodyText.match(regex);
            let kms = km_matches ? km_matches[0].trim() : 'Not found';
            if (kms === '64 km') {
                kms = 'Kms not found'
            }

            return {
                ...listing,
                title,
                kms,
                price,
                image: photos[0] ?? 'No image found',
                plate,
                price_details: null
            };
        } catch (error) {
            console.error('Error getting details:', error);
            return null;
        }
    }
}