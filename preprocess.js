'use strict';

module.exports = preprocess;

var path = require('path');
var fs = require('fs');

var includeExpr = /^@include\s+([A-Za-z0-9-_]+)(?:\.)?([a-zA-Z]*)$/gmi;
var includeData = {};

function preprocess(inputFile, input, cb) {
  input = stripComments(input);
  processIncludes(inputFile, input, function(err, data) {
    if (err) return cb(err);

    cb(null, data);
  });
}

function stripComments(input) {
  return input.replace(/^@\/\/.*$/gmi, '');
}

function processIncludes(inputFile, input, cb) {
  var includes = input.match(includeExpr);
  if (includes === null) return cb(null, input);
  var errState = null;

  var incCount = includes.length;
  if (incCount === 0) cb(null, input);
  includes.forEach(function(include) {
    var fname = include.replace(/^@include\s+/, '');

    // find .md (v0.10.x, v0.12.x) or .markdown (<v4) files
    if (!fname.match(/(\.md|\.markdown)$/)) {
      try {
        var fullFname = path.resolve(path.dirname(inputFile), fname + ".md");
        fs.accessSync(fullFname);
        fname += ".md";
      }
      catch (err)
      {
        fname += ".markdown";
      }
    }

    if (includeData.hasOwnProperty(fname)) {
      input = input.split(include).join(includeData[fname]);
      incCount--;
      if (incCount === 0) {
        return cb(null, input);
      }
    }

    var fullFname = path.resolve(path.dirname(inputFile), fname);
    fs.readFile(fullFname, 'utf8', function(er, inc) {
      if (errState) return;
      if (er) return cb(errState = er);
      preprocess(inputFile, inc, function(er, inc) {
        if (errState) return;
        if (er) return cb(errState = er);
        incCount--;

        // Add comments to let the HTML generator know how the anchors for
        // headings should look like.
        includeData[fname] = `<!-- [start-include:${fname}] -->\n` +
                             inc + `\n<!-- [end-include:${fname}] -->\n`;
        input = input.split(include + '\n').join(includeData[fname] + '\n');
        if (incCount === 0) {
          return cb(null, input);
        }
      });
    });
  });
}
