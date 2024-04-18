const puppeteer = require("puppeteer");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const fs = require("fs");

const outputFile = "add-storage.csv";
const fileExists = fs.existsSync(outputFile);

//set up the csv writer
const csvWriter = createCsvWriter({
    path: outputFile,
    header: [
        { id: 'name', title: 'Name' },
        { id: 'link', title: 'Link' },
        { id: 'result_number', title: 'Result Number' },
        { id: 'page', title: 'Page Number' }
    ],
    append: fileExists
});

async function scrapePage(query, pageNumber) {
    //set up our page and browser
    const url = `https://www.google.com/search?q=${query}&start=${pageNumber}`;
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
                scrapeContent.push({ name: name, link: linkHref,pageNumber: pageNumber, result_number: index});
                //add the link to our list of seen links
                seenLinks.push(linkHref);
                    index++;
            }
        }
    }
    await browser.close();
    await csvWriter.writeRecords(scrapeContent);
}
//main function
async function main() {
    console.log("Starting scrape...")
    await scrapePage("cool stuff", 0);
    console.log(`Scrape complete, results save to: ${outputFile}`);
}
//run the main function
main();