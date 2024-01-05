import fs from 'fs';
import axios from 'axios';
import path from 'path';

// for compressing images
import imagemin from 'imagemin';
import imageminPngquant from 'imagemin-pngquant';

const metadataFolderPath = './metadata';
const assetFolderPath = './asset';
const compressedAssetFolderPath = './compressed-asset';

const metadataBaseURL = 'https://madlads.s3.us-west-2.amazonaws.com/json/';
const imageBaseURL = 'https://madlads.s3.us-west-2.amazonaws.com/images/';

// // delete the folder if it exists
// if (fs.existsSync(metadataFolderPath) || fs.existsSync(assetFolderPath) || fs.existsSync(compressedAssetFolderPath)) {
//     fs.rmdirSync(metadataFolderPath, { recursive: true });
//     fs.rmdirSync(assetFolderPath, { recursive: true });
//     fs.rmdirSync(compressedAssetFolderPath, { recursive: true });
// }

// Create the metadata and asset folder if it doesn't exist
if (!fs.existsSync(metadataFolderPath)) {
    fs.mkdirSync(metadataFolderPath);
}

if (!fs.existsSync(assetFolderPath)) {
    fs.mkdirSync(assetFolderPath);
}

if (!fs.existsSync(compressedAssetFolderPath)) {
    fs.mkdirSync(compressedAssetFolderPath);
}

async function scrapeJSONMetadata() {
    // use async / await to scrape the metadata
    // make the script most efficient as possible
    // ensure in parallel you write data to file system so that fetching all data do not consume much read only memory

    // Create an array of promises
    let promisesArray = [];

    // Scrape the JSON files
    for (let i = 1; i <= 1000; i++) {
        const fileName = `${i}.json`;
        const fileURL = `${metadataBaseURL}${fileName}`;
        let responsePromise = axios.get(fileURL);
        promisesArray.push(responsePromise);

    }

    try {
        // Wait for all the promises to resolve, in case of any errors, catch them and retry
        let responses = await Promise.all(promisesArray);
        responses.forEach((response, index) => {
            const fileName = `${index + 1}.json`;
            const filePath = path.join(metadataFolderPath, fileName);
            fs.writeFileSync(filePath, JSON.stringify(response.data));
            console.log(`File ${fileName} scrapped and saved successfully.`);
        });

    } catch (error) {
        console.error(`Error scraping file: ${error.message}`);
    }

}

// use async / await to scrape the metadata
// make the script most efficient as possible
// ensure in parallel you write data to file system so that fetching all data do not consume much read only memory
// Function to download an image
async function downloadImage(ext, index) {
    const fileName = `${index}.${ext}`;
    const filePath = path.join(assetFolderPath, fileName);
    // function as atomic process intact with await
    const response = await axios.get(`${imageBaseURL}${index}.${ext}`, { responseType: 'arraybuffer' });
    fs.writeFileSync(filePath, response.data);
}

// Function to process a batch of image URLs
async function processBatchStartingAt(batchSize, startIndex) {
    // here using Promise.all to download all images in parallel at a higher level
    // map returns a new array that can be passed to Promise.all to wait for all promises to resolve
    // while if replaced map with forEach, it will not return a new array and Promise.all will not work, instead we need to manually push it to array of promises
    const promises = Array.from({ length: batchSize }).map((_, index) => downloadImage("png", startIndex + index));
    await Promise.all(promises);
    console.log("🚀 ~ file: index.js:74 ~ processBatchStartingAt ~ promises.length:", promises.length);
}

// Function to download all images in batches
async function downloadImagesInBatches(batchSize) {
    for (let i = 1; i <= 1000; i += batchSize) {
        await processBatchStartingAt(batchSize, i);
    }
}

// // function to compress the images
async function compressImages() {

    const files = await imagemin([`${assetFolderPath}/*.png`], {
        destination: compressedAssetFolderPath,
        plugins: [
            imageminPngquant({
                quality: [0.15, 0.3]
            })
        ]
    });

    console.log(files);
}

// // Download images in batches of 100
// downloadImagesInBatches(100).catch((error) => {
//     console.error(error);
//     process.exit(1);
// });

// scrapeJSONMetadata().catch((error) => {
//     console.error(error);
//     process.exit(1);
// });

// compressImages().catch((error) => {
//     console.error(error);
//     process.exit(1);
// });

async function main() {
    try {
        // run scrapeJSONMetadata and downloadImagesInBatches in parallel
        await Promise.all(
            [
                scrapeJSONMetadata(),
                downloadImagesInBatches(100)
            ]);
        // compress the images only after all the images are downloaded
        await compressImages();

    } catch (error) {
        console.error("🚀 ~ file: index.js:137 ~ main ~ error:", error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});