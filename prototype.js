const puppeteer = require("puppeteer");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const fs = require("fs");

async function scrapePage(query) {
    //set up our page and browser
    const url = `https://www.google.com/search?q=${query}`;
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    //go to the site
    await page.goto(url);
    //extract the nested divs
    const divs = await page.$$("div > div > div > div > div > div > div > div");
    const scrapeContent = []
    seenLinks = [];
    let index = 0;
    for (const div of divs) {
        const h3s = await div.$("h3");
        const links = await div.$("a");
        //if we have the required info
        if (h3s && links) {
            //pull the name
            const name = await div.$eval("h3", h3 => h3.textContent);
            //pull the link
            const linkHref = await div.$eval("a", a => a.href);
            //filter out bad links
            if (!linkHref.includes("https://proxy.scrapeops.io/") && !seenLinks.includes(linkHref)) {
                scrapeContent.push({ name: name, link: linkHref, result_number: index});
                //add the link to our list of seen links
                seenLinks.push(linkHref);
                    index++;
            }
        }
    }
    await browser.close();
    return scrapeContent;
}
//main function
async function main() {
    const results = await scrapePage("cool stuff");
    for (const result of results) {
        console.log(result);
    }
}
//run the main function
main();