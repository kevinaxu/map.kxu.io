
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


/*

async function convertHEIC(filePath) {
    console.log("convertHEIC()", filePath);
    try {
        // Read the HEIC file into memory
        const inputBuffer = fs.readFileSync(filePath);
        var outputFilePath = `/assets/${filePath}`;

        const outputBuffer = await convert({
            buffer: inputBuffer, // the HEIC file buffer
            format: 'JPEG',      // output format
            quality: 1          // the jpeg compression quality, between 0 and 1
        });

        const image = await jimp.read(outputBuffer);
        image
            .resize(1280, jimp.AUTO) // Resize the image to a width of 300 pixels
            .quality(80) // Set the quality to 80%
            //.write(outputFilePath); // Save the image to a file 

        console.log(`Saving JPEG: ${outputFilePath}`);
    } catch (error) {
        console.error('Error in convertHEIC():', error);
    }
}

async function convertHeicToJpeg(inputFilePath) {
    // if the input file path is already a JPG / JPEG / jpg / jpeg file, skip it

    // get the file extension from the input file path
    // lowercase the file extension
    // check if it's jpg or jpeg
    // if it is, then we only need to resize, we don't need to convert 
    var extension = inputFilePath.toLowerCase().split(".").pop();
    console.log("extension:", extension);
    if (extension == "jpg" || extension == "jpeg") {
        await resizeAndSaveJPG(inputFilePath);
    } else if (extension == "heic") {
        await convertHEIC(inputFilePath);
    } else {
        console.log("Skipping file:", inputFilePath);
    }
}


// Function to read all files in a directory
async function readFilesInDirectory(directoryPath) {
    console.log(`Reading all files in ${directoryPath}`);

    fs.readdir(directoryPath, (err, files) => {
        if (err) {
            console.error(`Error reading directory: ${err}`);
            return;
        }

        for (var i = 0; i < files.length; i++) {
            const file = files[i];
            const filePath = path.join(directoryPath, file);
            console.log(`File: ${filePath}`);

            // Check if it's a file (not a subdirectory)
            fs.stat(filePath, (statErr, stats) => {
                if (statErr) {
                    console.error(`Error reading file stats: ${statErr}`);
                    return;
                }

                if (stats.isFile()) {
                    convertHeicToJpeg(filePath);
                } else if (stats.isDirectory()) {
                // Recursively read files in subdirectories
                    readFilesInDirectory(filePath);
                }
            });
        }
    });
    console.log("\n\n");
}
  
readFilesInDirectory('./media');
*/




    /*
    try {
        // Read the HEIC file into memory
        const inputBuffer = fs.readFileSync(inputFilePath);

        const outputBuffer = await convert({
            buffer: inputBuffer, // the HEIC file buffer
            format: 'JPEG',      // output format
            quality: 1          // the jpeg compression quality, between 0 and 1
        });

        const image = await jimp.read(outputBuffer);
        image
            .resize(1280, jimp.AUTO) // Resize the image to a width of 300 pixels
            .quality(80) // Set the quality to 80%
            // .write(outputFilePath); // Save the image to a file 

        console.log(`Saved JPEG: ${outputFilePath}`);

    } catch (error) {
      console.error('Error converting HEIC to JPEG:', error);
    }
    */


      /*
      // Iterate through each file in the directory
      files.forEach((file) => {
        const filePath = path.join(directoryPath, file);
  
        // Check if it's a file (not a subdirectory)
        fs.stat(filePath, (statErr, stats) => {
          if (statErr) {
            console.error(`Error reading file stats: ${statErr}`);
            return;
          }
  
          if (stats.isFile()) {
            convertHeicToJpeg(filePath);
          } else if (stats.isDirectory()) {
            // Recursively read files in subdirectories
            readFilesInDirectory(filePath);
          }
        });

        console.log(`File: ${filePath}`);
      });
    });
    */

/*
const INPUT = "/media";
const OUTPUT = "/assets";

const files = [
    "/media/IMG_3846.heic",
    "/media/IMG_3927.jpg", 
    "/media/IMG_4126.HEIC",
]

// get filename of all files in a directory 
// for each one of those filenames
for (var i = 0; i < files.length; i++) {
    console.log("Processing file:", files[i]);

    var file = files[i];
    var newFileName = file.toLowerCase();
    console.log("new file name:", newFileName);
    break;
}
*/


