
/*******************************************************************
 * Process a directory of images 
 * - lowercase all file names
 * - convert image format to jpg
 * - reduce image size / quality 
 * 
 * 
 * Input:   directory path
 * Output:  directory path
 * 
 ********************************************************************/

const fs = require('fs');
const path = require('path');
const jimp = require('jimp');
const convert = require('heic-convert');

const INPUT_DIR = "./media/test";
const OUTPUT_DIR = "./assets/test"; 

processImages(INPUT_DIR);

async function processImages(inputFileDirectory) {
    files = fs.readdirSync(inputFileDirectory);

    for (var i = 0; i < files.length; i++) {
        const file = files[i];
        console.log("Processing File:", inputFileDirectory + "/" + file);

        if (path.extname(file).toLowerCase() == ".heic") {
            await processHEIC(inputFileDirectory + "/" + file);
        } else if (path.extname(file).toLowerCase() == ".jpg") {
            await processJPG(inputFileDirectory + "/" + file);
        } else {
            console.log("Skipping file:", file);
        }
        console.log("\n");
    }
}

// convert HEIC --> JPG, resize JPG
async function processHEIC(inputFilePath) {
    console.log("convertHEIC()");
    try {
        // Read the HEIC file into memory
        const inputBuffer = fs.readFileSync(inputFilePath);
        const outputFilePath = getNewFilePath(getFileNameFromPath(inputFilePath));

        const outputBuffer = await convert({
            buffer: inputBuffer, // the HEIC file buffer
            format: 'JPEG',      // output format
            quality: 1          // the jpeg compression quality, between 0 and 1
        });

        const image = await jimp.read(outputBuffer);
        image
            .resize(1280, jimp.AUTO) // Resize the image to a width of 300 pixels
            .quality(80) // Set the quality to 80%
            .write(outputFilePath); // Save the image to a file 
        console.log("Saving File:", outputFilePath);
    } catch (error) {
        console.error('Error in convertHEIC():', error);
    }
}

async function processJPG(inputFilePath) {
    console.log("resizeJPG()");
    try {
        const inputBuffer = fs.readFileSync(inputFilePath);
        const outputFilePath = getNewFilePath(getFileNameFromPath(inputFilePath));

        const image = await jimp.read(inputBuffer);
        image
            .resize(1560, jimp.AUTO) // Resize the image to a width of 300 pixels
            .quality(80) // Set the quality to 80%
            .write(outputFilePath); // Save the image to a file 
        console.log(`Saving File: ${outputFilePath}`);
    } catch (error) {
        console.error('Error in resizeJPG():', error);
    }
}

function getFileNameFromPath(inputFilePath) {
    return path.basename(inputFilePath);
}
function getNewFileName(fileName) {
    return fileName.toLowerCase().split(".").shift() + ".jpg";
}
function getNewFilePath(fileName) {
    return OUTPUT_DIR + "/" + getNewFileName(fileName);
}
