require('dotenv').config()
const puppeteer = require('puppeteer');
const prompt = require('prompt-sync')();
const format = require('date-fns/format');
const open = require('open');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

const constants = require('./constants');

let siteIndex = 0;
let browser, page;
let inQueue = true;


async function getReservationDates() {
    browser = await puppeteer.launch();
    page = await browser.newPage();
    const siteVars = constants.vaxSites[siteIndex];
    let pageResponse;
    let pageCount = 0;
    // Have to set user agent to get passed cloudeflare
    await page.setUserAgent('5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36');
    await page.setViewport({ width: 1080, height: 3000 });
    try {
        pageResponse = await page.goto(siteVars.url, {
            waitUntil: 'networkidle0',
        });
        const pageStatus = pageResponse.status();
        if (pageStatus !== 200) {
         throw 'Response was not 200: ' + pageStatus;
        }
    } catch (error) {
        console.log(error);
        await client.messages
        .create({
            body: 'There was an error loading ' + siteVars.name + ': ' + siteVars.bitly,
            from: process.env.FROM,
            to: process.env.CONTACTS_TO
        })
        .then((message) => {
            console.log(message.sid)
        });
        // Lets try reloading:
        page.reload({ waitUntil: ["networkidle0"]});
    }
    while(pageCount < siteVars.selectors.length) {
        await page.waitForSelector(siteVars.selectors[pageCount]);
        if (siteVars.name == 'ShopRite' && pageCount < 1) {
            await handleShoprite();
        }
        const emptyIndicator = await page.$$(siteVars.emptyIndicator);
        if (!emptyIndicator.length) {
            if(siteVars.name != 'ShopRite' || inQueue) {
                await client.messages
                .create({
                    body: 'There may be appointments available at ' + siteVars.name + ': ' + siteVars.bitly,
                    from: process.env.FROM,
                    to: process.env.CONTACTS_TO
                })
                .then((message) => {
                    console.log(message.sid)
                });
            }
            if (siteVars.name == 'ShopRite') { 
                if (inQueue) {
                    await page.click('#MainPart_aExitLine');
                } else {
                    pageCount = siteVars.selectors.length
                }
            }
            
        }
        pageCount++
    }
    return
}

async function handleShoprite () {
    const ctas = await page.$$('.threeColumnRow .threeColumnRow__column a.secondaryButton');
    ctas[2].click();
    await page.waitForTimeout(3000);
    const url = await page.url();
    // Check if we made it through the queue and onto the vaccine sign up
    if(url == 'https://shoprite.reportsonline.com/shopritesched1/program/Imm/Patient/Advisory') {
        const covidAlerts = await page.evaluate(() => Array.from(document.querySelectorAll('.leftPaddingOnly h2 p'), div => div.innerText))
        if(
            covidAlerts.length > 1 && 
            covidAlerts[1] == 'There are currently no COVID-19 vaccine appointments available.  Please check back later.  We appreciate your patience as we open as many appointments as possible.  Thank you.'
        ) {
            inQueue = false;
        }
    }
}

(async() => {

    try {
        while(siteIndex < constants.vaxSites.length) {
            await getReservationDates();
            siteIndex++;
        }
    } catch (e) {
        console.log(e)
    } finally {
        await browser.close();
    }
        

    process.exit();
})();