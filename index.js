const puppeteer = require('puppeteer');
const prompt = require('prompt-sync')();
const format = require('date-fns/format');

const HUNTINGTON_URL = "https://outlook.office365.com/owa/calendar/BurbankIndoorPool@ymcaboston.org/bookings/";

function formatDateArray(dates) {
    const formattedDates = dates.map((date) => {
        let isoDate = new Date(date.replace(/-/g, '\/').replace(/T.+/, ''))
        return format(isoDate, "E, LLL dd")
    });

    return formattedDates;
}

(async() => {
    console.log('checking huntington...');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 3000 });

    await page.goto(HUNTINGTON_URL, {
        waitUntil: 'networkidle0',
    });
    await page.waitForSelector('.picker');

    await page.click('#service_1');

    console.log('getting bookable dates...');
    await page.waitFor(3000);
    const data = await page.evaluate(() => 
        Array.from(document.querySelectorAll('[title*="Times available"]')).map(date => date.getAttribute('data-value'))
    );

    console.log('there are available times on these dates: ', formatDateArray(data));
    const selectedDate = prompt('which one? ');
    console.log('looking up available times...');

    await page.click(`[data-value="${data[selectedDate]}"]`);

    const availableTimes = await page.evaluate(() => 
        Array.from(document.querySelectorAll('.timePicker li label span')).map(time => time.innerText)
    );

    console.log('these are the available times: ', availableTimes);
    const bookIntent = prompt('Do you want to book any of these times? (y/n) ');

    if(bookIntent === "y") {
        const whichTime = prompt('Which one? ');
        await page.click(`#timeslot_${whichTime}`);
        await page.screenshot({path: 'screenshot.png'});
    } else {
        await browser.close();
    }

    await browser.close();
})();