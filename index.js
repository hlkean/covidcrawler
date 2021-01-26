require('dotenv').config()
const puppeteer = require('puppeteer');
const prompt = require('prompt-sync')();
const format = require('date-fns/format');
const open = require('open');
var schedule = require('node-schedule');


const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

const constants = require('./constants');

let inQueue = true;

async function getReservationDates(siteIndex, browser, page) {
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
        await sendMessage('There was an error loading ' + siteVars.name + ': ' + siteVars.bitly);
        // Lets try reloading:
        page.reload({ waitUntil: ["networkidle0"]});
    }
    while(pageCount < siteVars.selectors.length) {
        await page.waitForSelector(siteVars.selectors[pageCount]);
        if (siteVars.name == 'ShopRite' && pageCount < 1) {
            await handleShoprite(page);
        }
        const emptyIndicator = await page.$$(siteVars.emptyIndicator);
        if (!emptyIndicator.length) {
            if(siteVars.name != 'ShopRite' || inQueue) {
                await sendMessage('There may be appointments available at ' + siteVars.name + ': ' + siteVars.bitly);
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

async function sendMessage (text) {
    let numArr = process.env.CONTACTS_TO.split(' | ');
    for(let i = 0; i<numArr.length; i++) {
        await client.messages
        .create({
            body: text,
            from: process.env.FROM,
            to: numArr[i]
        })
        .then((message) => {
            console.log(message.sid)
        });
    }
}

async function handleShoprite (page) {
    const ctas = await page.$$('.threeColumnRow .threeColumnRow__column a.secondaryButton');
    ctas[2].click();
    await page.waitForTimeout(4000);
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


const checkAppointments = async() => {
    let siteIndex = 0;
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    try {
        while(siteIndex < constants.vaxSites.length) {
            await getReservationDates(siteIndex, browser, page);
            siteIndex++;
        }
    } catch (e) {
        console.log(e)
    } finally {
        await browser.close();
    }
        

    // process.exit();
};

schedule.scheduleJob('*/15 * * * *', function(){
    console.log("scheduling appointments");
    checkAppointments();
});