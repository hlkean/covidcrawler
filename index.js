require('dotenv').config()
const puppeteer = require('puppeteer');
const prompt = require('prompt-sync')();
const format = require('date-fns/format');
const open = require('open');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

const constants = require('./constants');

// let availableDates = [];
let siteIndex = 0;
let browser, page;
let inQueue = true;

// function formatDateArray(dates) {
//     const formattedDates = dates.map((date) => {
//         let isoDate = new Date(date.replace(/-/g, '\/').replace(/T.+/, ''))
//         return format(isoDate, "E, LLL dd")
//     });

//     return formattedDates;
// }


async function getReservationDates() {
    console.log(`checking ${constants.vaxSites[siteIndex].name}`);
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
         console.log(`Page load response was ${pageStatus}`);
         throw 'Response was not 200: ' + pageStatus;
        }
    } catch (error) {
        console.log('Was unable to navigate to page:');
        console.log(error);
        // TODO: Send text that there was an error
        // Lets try reloading:
        page.reload({ waitUntil: ["networkidle0"]});
    }
    while(pageCount < siteVars.selectors.length) {
        console.log("going in pagecount number: ", siteIndex, siteVars.selectors.length);

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
    console.log("found ctas", ctas);
    ctas[2].click();
    console.log("clicked the cta");
    await page.waitForTimeout(3000);
    const url = await page.url();
    console.log("url:::", url);
    // Check if we made it through the queue and onto the vaccine sign up
    if(url == 'https://shoprite.reportsonline.com/shopritesched1/program/Imm/Patient/Advisory') {
        const covidAlerts = await page.evaluate(() => Array.from(document.querySelectorAll('.leftPaddingOnly h2 p'), div => div.innerText))
        if(
            covidAlerts.length > 1 && 
            covidAlerts[1] == 'There are currently no COVID-19 vaccine appointments available.  Please check back later.  We appreciate your patience as we open as many appointments as possible.  Thank you.'
        ) {
            console.log("no more vaccines");
            inQueue = false;
        }
    }
}

(async() => {

    try {
        while(siteIndex < constants.vaxSites.length) {
            // if(availableDates.length > 0) {
                console.log("going in number: ", siteIndex, constants.vaxSites.length);
                await getReservationDates();
                siteIndex++;

                // const selectedDate = prompt('which date? -- "next" for next pool ');
                // if(selectedDate === 'next') {
                //     await goToNextPool();
                // } else {
                //     console.log('looking up available times...');
                //     await page.click(`[data-value="${availableDates[selectedDate]}"]`);

                //     const availableTimes = await page.evaluate(() => 
                //         Array.from(document.querySelectorAll('.timePicker li label span')).map(time => time.innerText)
                //     );

                //     console.log('these are the available times: ', availableTimes);
                    
                //     const bookIntent = prompt('Do you want to book any of these times? (y/n) -- (next for next pool) ');

                //     if(bookIntent === 'y') {
                //         console.log('opening a browser window');
                //         await open(constants.vaxSites[siteIndex].url);
                //         // assume booking, close process
                //         process.exit();
                //     } else if (bookIntent === 'next') {
                //         await goToNextPool();
                //     }
                // }
            // } else {
            //     siteIndex++;
            //     await getReservationDates();
            // }
        }
    } catch (e) {
        console.log("In catch block");
        console.log(e)
    } finally {
        console.log("closing browser");
        await browser.close();
    }
        

    process.exit();
})();