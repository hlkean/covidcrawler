const puppeteer = require('puppeteer');

describe('checks for appointments', () => {
    let browser, page;
    beforeAll(async() => {
        browser = await puppeteer.launch({ devtools: true, headless: false});
        page = await browser.newPage();

        await page.setViewport({ width: 1080, height: 1920 });
        await page.goto('https://outlook.office365.com/owa/calendar/HuntingtonPool1@ymcaboston.org/bookings/');
    });

    it('lands on the page', async() => {
        await page.waitForSelector('body');
    });

    // afterAll(() => {
    //     browser.close();
    // })
});