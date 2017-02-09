"use strict"

var path = require("path");

const Promise = require("bluebird");
const fs = Promise.promisifyAll(require("fs"));
const processIncludes = Promise.promisify(require("./preprocess"));
const JSONify = Promise.promisify(require("./json"));
const R = require("ramda");
const rimraf = require("rimraf");
const simpleGit = require('simple-git');

function mkdirTemp() {
    // use a unique path where we'll clone Node's Git repo and delete when we're done
    // TODO: when it's safe to eliminate support on Node < v5.10.0, we can use fs.mkdtemp() instead

    var workingDir = path.join("/tmp", `node-${Date.now()}`);
    fs.mkdirSync(workingDir);

    return workingDir;
}

function generateAll(nodeVersions) {
    // const nodeSrcDir = mkdirTemp();
    var nodeSrcDir = path.join(
        "/tmp",
        "node-1486672852023"
    );

    const git = Promise.promisifyAll(simpleGit(nodeSrcDir));

    // clone git into temp directory
    function cloneNodeSrc(workingDir) {
        console.log("Cloning Node source...");
        return git.clone("git@github.com:nodejs/node.git", workingDir);
    }

    // run aFunction for every version in nodeVersions
    function forEachNodeVersion(nodeVersions, aFunction) {
        return Promise.mapSeries(nodeVersions, function(v) {
            console.log(`Running on ${v}`);
            return git.checkout(`tags/v${v}`).then(() => generateDocs(nodeSrcDir, v));
        });
    }

    cloneNodeSrc(nodeSrcDir)
    .then(() => {
        console.log("Done cloning.");
        return forEachNodeVersion(nodeVersions, (version) => console.log(version))
        .catch(err => console.log(`ERROR: ${err.message}`))
        .then(() => {
            console.log("Clean up");
            return rimraf(nodeSrcDir, () => console.log("Done"));
        });
    });
}

function generateDocs(nodeSrcDir, version) {
    const docsPath = path.join(nodeSrcDir, "doc", "api");
    const OUTPUT_PATH = "output";

    var fileName = `${version}.json`;
    var files = fs.readdirSync(docsPath);

    function render(file) {
        var result = "";

        let inputFile = path.join(docsPath, file);
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

                    object[aJSON.modules[0].name + "." + aMethod.name] = {
                        title: aMethod.textRaw,
                        docsText: aMethod.desc,
                        signatures: aMethod.signatures
                    };
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
        var result = {};
        var sortedKeys = Object.keys(aResult).sort();
        sortedKeys.forEach(function(key) {
            result[key] = aResult[key];
        });
        return result;
    }).then(function (aResult)
    {
        var destination = path.join(OUTPUT_PATH, fileName);
        fs.writeFileSync(destination, JSON.stringify(aResult, null, 2), "utf8");
        console.log("Output written to " + destination);
    });
}

module.exports = generateAll;
