"use strict"

var path = require("path");

const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));
const processIncludes = Promise.promisify(require("./preprocess"));
const JSONify = Promise.promisify(require("./json"));
const R = require("ramda");

const BASE_PATH = "docs";
const OUTPUT_PATH = "output";
const SORT_KEYS = true;

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

function sortKeys(aJSON)
{
    if (SORT_KEYS) {
        var result = {};
        var sortedKeys = Object.keys(aJSON).sort();
        sortedKeys.forEach(function(key) {
            result[key] = aJSON[key];
        });
        return result;
    }
    return aJSON;
}

var every = { };
Promise.map(files, function (aFileName)
{
    let inputFile = path.join(BASE_PATH, aFileName);
    return fs.readFileAsync(inputFile, 'utf8')
    .then(JSON.parse)
    .then(sortKeys)
    .then(function (aJSON)
    {
        fs.writeFileSync(path.join("output", aFileName), JSON.stringify(aJSON, null, 2), "utf8");
    })
});
