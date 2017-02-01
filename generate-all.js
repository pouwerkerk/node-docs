"use strict"

var path = require("path");

const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));
const processIncludes = Promise.promisify(require("./preprocess"));
const JSONify = Promise.promisify(require("./json"));
const R = require("ramda");

const BASE_PATH = "../node/doc/api";
const OUTPUT_PATH = "output";

var fileName = process.argv[2] || "output.json";
var files = fs.readdirSync(BASE_PATH);

function render(file) {
    var result = "";

    let inputFile = path.join(BASE_PATH, file);
    if (!inputFile) {
        console.error('Input file = %s', inputFile);
        throw new Error('No input file specified');
    }

    return fs.readFileAsync(inputFile, 'utf8')
        .then(contents => processIncludes(inputFile, contents))
        .then(processed => JSONify(processed, inputFile))
        .catch(err => { console.log("ERROR", err); });
}

var every = { };
Promise.map(files, function (aFileName)
{
    return render(aFileName).then(function (aJSON)
    {
        console.log("Parsing " + aFileName);
        var object = { };
        if (aJSON.modules && aJSON.modules[0].methods)
        {
            aJSON.modules[0].methods.forEach(function(aMethod)
            {
                // Generate links
                var signature = aMethod.signatures[0];
                var args = "";

                object[aJSON.modules[0].name + "." + aMethod.name] = { title: aMethod.textRaw, docsText: aMethod.desc, signatures: aMethod.signatures };
            });
        } else {
            console.log("Skipping " + aFileName);
        }
        return object;
    })
}).then(function (result)
{
    return result.reduce(function (accum, next)
    {
        return Object.assign(accum, next)
    }, { });
}).then(function (aResult)
{
    var destination = path.join(OUTPUT_PATH, fileName);
    fs.writeFileSync(destination, JSON.stringify(aResult, null, 2), "utf8");
    console.log("Output written to " + destination);
});
