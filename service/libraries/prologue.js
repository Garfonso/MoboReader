/*jslint sloppy: true */
/*global IMPORTS, console, require:true, process, log */
/*exported Foundations, fs, path, Future */
console.error("Starting to load libraries");

// Load the Foundations library and create
// short-hand references to some of its components.
var Foundations = IMPORTS.foundations;
var Future = Foundations.Control.Future;

//now add some node.js imports:
if (typeof require === "undefined") {
	require = IMPORTS.require;
}
var fs = require('fs'); //required for own node modules and current vCard converter.
var path = require('path'); //required for vCard converter.

console.error("--------->Loaded Libraries OK1");

process.on("uncaughtException", function (e) {
	log("Uncaought error:", e);
	//throw e;
});

