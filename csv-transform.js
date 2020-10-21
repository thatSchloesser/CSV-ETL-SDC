//my's csv parser 

const fs = require('fs');

// FS.promises as a small subset of fs functions that are promisified.
const fsp = fs.promises;

const path = require('path');

//https://nodesource.com/blog/understanding-streams-in-nodejs/
const Transform = require('stream').Transform;
​
//set dirname

// Here we call the promisified version of readdir with the parameter
// of __dirname to get an array of all files in our current directory.
fsp.readdir(__dirname)
    
    // Pass the array of files we're receiving as 'arr'.
    .then((arr) => {
        // We need to filter the file we're getting. We're only
        // interested in .csv files.
        // Note: This filter will only pick up .csv files in the
        // root directory. Any .csv files in folders will be
        // ignored.
        const filtered = arr.filter((file) => {
            
            //return csv files
            if (file.includes('/')) {return false;}
            const split = file.split('.');
            const extension = split[split.length - 1];
            if (extension === 'csv') {
                return true;
            }
            // Otherwise functions return undefined by default which is
            // the equivalent of returning false.
        })
        // This .then was only for filtering csv files so we're finally
        // done here! Pass the filtered array (now only containing CSV 
        // files) to the next .then.
        return filtered
    })
    // Pass the array of files we're receiving as 'csvs'.
    .then((csvs) => {
        // We're going to run a function that returns a promise so we'll
        // need to use Promise.all to resolve all promises psuhed into
        // this 'promises' array.
        const promises = [];
        // Itterate through all the csv files in csvs.
        for (let fileName of csvs) {
            // Push the promise returned by findKeys to our promisses
            // array (I suggest you go look at what findKeys does).
            promises.push(findKeys(
                // The name of our file will whatever preceeds the first
                // '.' character.
                fileName.split('.')[0],
                // The path to that file is the __dirname (current
                // directory) and the file name.
                path.join(__dirname, fileName)
            ));
        }
        // We're finally done pushing the promises in to our promises
        // array. Put that array in a Promise.all and pass it down to
        // the next .then.
        return Promise.all(promises);
    })
    // When the Promise.all from the last .then resolves we'll have a
    // array where every element is a object with the name of the file
    // or database, and the keys its table has. We pass that array as
    // 'tables'.
    .then((tables) => {
        console.log(tables);
    })
    // Log any errors.
    .catch((err) => {console.log(err)});
​
// This function is ran by the .then chain above. It takes a table name
// and the location of it's CSV file and outputs a promise that resolves
// a object with that table's column names (keys) and its name.
const findKeys = (name, filePath) => {
    // All of our code is inside the promise so we can return right away.
    return new Promise((resolve, reject) => {
        // We use try + catch here to know if we should reject or not.
        try {
            // Here we use the default fs module's createReadStream. 
            // This creates a object that reads bits and peices of the
            // file it's targeting over time instead of trying to
            // read it all at the same time.
            const fileToRead = fs.createReadStream(filePath);
            const encoding = 'utf-8'
            // Here we use transform to crease a new Transform
            // stream. We'll be 'piping' (passing this down to)
            // our read-stream above later.
            const transform = new Transform({
                // writableObjectMode is what controls whether we can
                // pass data to this stream or not. If we didn't set
                // this to true our transform stream would never be
                // able to receive data from our read-stream.
                writableObjectMode: true,
                // Here we're setting up the actual transform function
                // that's ran whever we get another bit of data from
                // the read-stream. It takes in the following 
                // parameters:
                //
                //  * chunk:        The current bit of data the function 
                //              is working with.
                //  * encoding:     The type of the data we're getting
                //              (the default text is in the 'utf-8' 
                //              format).
                //  * callback:      The callback to call once we're
                //              done transforming the data (you can 
                //              think of as being the equivlant to
                //              promise's 'resolve' parameter).
                //
                // Because of how we're using transform in this specific
                // senario (using it to intercept the first bit of data
                // and then returning it filtered) we won't be using
                // the callback. Otherwise it's normally manditory to
                // use it.
                // Another pesky detail you might not know: encoding is
                // ignored if a stream is in writeable mode, so if you
                // know what 'setEncoding' is forget it- it doesn't 
                // transform your data for you. 
                
                transform(chunk, encoding, callback) {
                    // First we convert the chunk of data in to a 
                    // string.
                    const data = chunk.toString();
                    // We have no idea how much data we're getting. It
                    // could be one line, or thousands of lines. That's
                    // why we need to split them by '\n'. In csv files
                    // each new row is seperated by a new line. By doing
                    // this we're making sure we only target the line
                    // containing the data we want (... the object keys).
                    const lines = data.split('\n');
                    // Now we grab the first line of the file and split
                    // it by the ',' character (note that if the first
                    // line of a file is empty andd the keys are on the
                    // second line, this function might fail. Consider
                    // adding a error handler for that if your csv
                    // files are messy).
                    const keys = lines[0].split(',');
                    // Now that we presumably have the table's keys we
                    // can shove the name and keys in to a object and
                    // resolve our promise.
                    const tableObject = { name, keys };
                    resolve(tableObject);
                    // This is telling our read-stream to close up and
                    // stop reading data from our file. It's VERY VEEERY
                    // IMPORTANT that you ALWAYS close your streams once
                    // you're done with them!!!
                    fileToRead.close();
                }
            });
​
            // Now that we have our read-stream and transform-stream
            // ready we can finally pipe (pass down) the data from the
            // read stream to the transform-stream. This is done by 
            // using .pipe on the read stream and passing our transform
            // stream as a arguement for pipe.
            fileToRead.pipe(transform);
        // If an error is ever thrown we'll immidately stop the code
        // above and come down here.
        } catch (err) {
            // Pass the err object we got via reject.
            reject(err);
        }
    });
}