const puppeteer = require("puppeteer");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const fs = require("fs");

const outputFile = "add-concurrency.csv";
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

async function scrapePage(browser, query, pageNumber, location, retries=3) {
    let tries = 0;
    while (tries <= retries) {
        const page = await browser.newPage();
        try {            
            const url = `https://www.google.com/search?q=${query}&start=${pageNumber * 10}`;
            //set a long timeout, sometimes the server take awhile
            await page.goto(url, { timeout: 300000 });
            //find the nested divs
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
                        scrapeContent.push({ name: name, link: linkHref, page: pageNumber, result_number: index});
                        seenLinks.push(linkHref);
                        index++;
                    }
                }  
            }
            //we failed to get a result, throw an error and attempt a retry
            if (scrapeContent.length === 0) {
                throw new Error(`Failed to scrape page ${pageNumber}`);
            //we have a page result, write it to the csv
            } else {
                await csvWriter.writeRecords(scrapeContent);
                //exit the function
                return;
            }
        } catch(err) {
            console.log(`ERROR: ${err}`);
            console.log(`Retries left: ${retries-tries}`)
            tries++;
        } finally {
            await page.close();
        }
    }
    throw new Error(`Max retries reached: ${tries}`);
}
//scrape multiple pages at once
async function concurrentScrape(query, totalPages) {
    const browser = await puppeteer.launch();
    const tasks = [];
    for (let i = 0; i < totalPages; i++) {
        tasks.push(scrapePage(browser, query, i));
    }
    await Promise.all(tasks);
    await browser.close();
}
//main function
async function main() {
    console.log("Starting scrape...")
    await concurrentScrape("cool stuff", 3);
    console.log(`Scrape complete, results save to: ${outputFile}`);
}
//run the main function
main();