const puppeteer = require('puppeteer');
const prompt = require('prompt-sync')();
const format = require('date-fns/format');
const open = require('open');

const constants = require('./constants');

// let availableDates = [];
let siteIndex = 0;
let browser, page;

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
    // const siteVars = constants.vaxSites[siteIndex];
    let pageResponse;
    // Have to set user agent to get passed cloudeflare
    await page.setUserAgent('5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36');
    await page.setViewport({ width: 1080, height: 3000 });
    try {
        pageResponse = await page.goto(constants.vaxSites[siteIndex].url, {
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
    let pageCount = 0
    while(pageCount < constants.vaxSites[siteIndex].selectors.length) {

        await page.waitForSelector(constants.vaxSites[siteIndex].selectors[pageCount]);
        console.log("selector found");
        if (constants.vaxSites[siteIndex].name == 'ShopRite' && pageCount > 0) {
            await page.$$('.threeColumnRow .threeColumnRow__column a.secondaryButton').click();
            await page.waitForTimeout(3000);
        }
        const emptyIndicator = await page.$$(constants.vaxSites[siteIndex].emptyIndicator);
        if (emptyIndicator.length) {
            console.log("No appointments available at the moment!");
        } else {
            console.log("something has changed on the site and we should send a text with link: " + constants.vaxSites[siteIndex].bitly);
            if (constants.vaxSites[siteIndex].name == 'ShopRite') {
                console.log("exiting shoprite");
                await page.click('#MainPart_aExitLine');
            }
            // TODO: Send text via twillio
        }
        pageCount++;
    }
    

    // await page.click('input[aria-label*="Single" i],input[aria-label*="Solo" i]');
    
    // console.log('getting bookable dates...');
    // await page.waitForTimeout(3000);
    // availableDates = await page.evaluate(() => 
    // Array.from(document.querySelectorAll('[title*="Times available"]')).map(date => date.getAttribute('data-value'))
    // );
    
    // console.log('there are available times on these dates: ', formatDateArray(availableDates));
}

// async function goToNextPool() {
//     if(siteIndex === constants.vaxSites.length - 1) {
//         // end of list, exit tool
//         process.exit();
//     } else {
//         siteIndex++;
//         await getReservationDates();
//     }
// }

(async() => {

    while(siteIndex < constants.vaxSites.length) {
        // if(availableDates.length > 0) {
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

    process.exit();
})();