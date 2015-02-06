/*jslint node: true */
/*global fs, path, Config, Future, servicePath, Utils, Log*/
var DownloadSpritzAssistant = function () {
	"use strict";
};

var nodejsMajorVersion = Number(process.version.match(/^v\d+\.(\d+)/)[1]);
if (nodejsMajorVersion >= 4) {
	var httpClient = require(servicePath + "/libraries/httpClient.js");
} else {
	var httpClient = require(servicePath + "/libraries/httpClient_legacy.js");
}

DownloadSpritzAssistant.prototype.modifyCss = function (css) {
	"use strict";
	css = css.replace(/\/\/sdk\.spritzinc\.com\/js\/1\.0\//g, "file://" + Config.storagePath + "assets/"); //load additional stuff from local filesystem instead of remote server.
	return css;
};

var downloadFile = function (params) {
	"use strict";
	var options = {
			headers: {}
		},
		future = new Future();
	httpClient.parseURLIntoOptions(params.url, options);

	httpClient.sendRequest(options).then(function requestCallback(f) {
		var result = f.result;
		if (result.returnValue) {
			if (params.transformFunc) {
				result.body = params.transformFunc(result.body.toString("utf8"));
			}

			fs.writeFile(params.target, result.body, function (err) {
				if (err) {
					Log.log("Writing ", params.target, " failed: ", err);
					future.result = false;
				} else {
					future.result = true;
				}
			});
		} else {
			delete result.body;
			Log.log("Download of ", params.url, " failed: ", result);
			future.result = false;
		}
	});

	return future;
};

/*
 * Checks if first image of array exists, downloads otherwise, then continues with next image, until array is empty.
 */
var checkFiles = function (files) {
	"use strict";
	if (!files.length) {
		Log.debug("No more files, can return now.", files);
		return new Future(true);
	}
	var future = new Future(),
		fileParams = files.shift();

	path.exists(fileParams.target, function (exists) {
		if (exists) {
			Log.debug("File ", fileParams.target, " already exists: ", exists, ". Check next one.");
			future.nest(checkFiles(files));
		} else {
			Log.debug("Start download of ", fileParams.url);
			downloadFile(fileParams).then(function dlCallback(f) {
				Log.debug("Download of ", fileParams.url, " done. Result: ", f.result);
				future.nest(checkFiles(files));
			});
		}
	});

	return future;
};

var checkPaths = function (paths) {
	"use strict";
	if (!paths.length) {
		Log.debug("Directory check done.");
		return new Future(true);
	}

	var future = new Future(),
		curPath = paths.shift();

	path.exists(curPath, function (exists) {
		if (!exists) {
			fs.mkdir(curPath, parseInt("0777", 8), function (error) {
				if (error) {
					Log.log("Could not create ", curPath, " error: ", error);
					future.result = false;
				} else {
					future.nest(checkPaths(paths));
				}
			});
		} else {
			future.nest(checkPaths(paths));
		}
	});

	return future;
};

DownloadSpritzAssistant.prototype.run = function (outerfuture) {
	"use strict";
	var args = this.controller.args,
		future = new Future(),
		filesToLoad = [
			{
				url: "http://sdk.spritzinc.com/js/1.2.2/js/spritz.min.js",
				target: Config.storagePath + "assets/jslibraries/spritz.1.2.2.min.js"
			}, {
				url: "http://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js",
				target: Config.storagePath + "assets/jslibraries/jquery-2.1.1.min.js"
			},
			{
				url: "http://sdk.spritzinc.com/js/1.2.2/css/spritz.min.css",
				target: Config.storagePath + "assets/css/spritz.min.css",
				transformFunc: this.modifyCss.bind(this)
			},
			{
				url: "http://sdk.spritzinc.com/js/1.0/fonts/spritz_medien_bold.eot",
				target: Config.storagePath + "assets/fonts/spritz_medien_bold.eot"
			},
			{
				url: "http://sdk.spritzinc.com/js/1.0/fonts/spritz_medien_bold.woff",
				target: Config.storagePath + "assets/fonts/spritz_medien_bold.woff"
			},
			{
				url: "http://sdk.spritzinc.com/js/1.0/fonts/spritz_medien_bold.svg",
				target: Config.storagePath + "assets/fonts/spritz_medien_bold.svg"
			},
			{
				url: "http://sdk.spritzinc.com/js/1.0/fonts/spritz_medien_bold.ttf",
				target: Config.storagePath + "assets/fonts/spritz_medien_bold.ttf"
			},
			{
				url: "http://sdk.spritzinc.com/js/1.0/fonts/spritz_medien_medium.eot",
				target: Config.storagePath + "assets/fonts/spritz_medien_medium.eot"
			},
			{
				url: "http://sdk.spritzinc.com/js/1.0/fonts/spritz_medien_medium.svg",
				target: Config.storagePath + "assets/fonts/spritz_medien_medium.svg"
			},
			{
				url: "http://sdk.spritzinc.com/js/1.0/fonts/spritz_medien_medium.ttf",
				target: Config.storagePath + "assets/fonts/spritz_medien_medium.ttf"
			},
			{
				url: "http://sdk.spritzinc.com/js/1.0/fonts/spritz_medien_medium.woff",
				target: Config.storagePath + "assets/fonts/spritz_medien_medium.woff"
			},
			{
				url: "http://sdk.spritzinc.com/js/1.2/fonts/SpritzControls.eot",
				target: Config.storagePath + "assets/fonts/SpritzControls.eot"
			},
			{
				url: "http://sdk.spritzinc.com/js/1.2/fonts/SpritzControls.svg",
				target: Config.storagePath + "assets/fonts/SpritzControls.svg"
			},
			{
				url: "http://sdk.spritzinc.com/js/1.2/fonts/SpritzControls.ttf",
				target: Config.storagePath + "assets/fonts/SpritzControls.ttf"
			},
			{
				url: "http://sdk.spritzinc.com/js/1.2/fonts/SpritzControls.woff",
				target: Config.storagePath + "assets/fonts/SpritzControls.woff"
			},
			{
				url: "http://sdk.spritzinc.com/js/1.2.2/images/sprite.png",
				target: Config.storagePath + "assets/images/sprite.png"
			},
			{
				url: "http://sdk.spritzinc.com/js/1.0/images/ajax_loader.gif",
				target: Config.storagePath + "assets/images/ajax_loader.gif"
			}
		],
		paths = [
			Config.storagePath + "assets/",
			Config.storagePath + "assets/images/",
			Config.storagePath + "assets/fonts/",
			Config.storagePath + "assets/jslibraries/",
			Config.storagePath + "assets/css/"
		];

	if (this.locked) {
		console.error("Already downloading spritz. Don't do it again.");
		outerfuture.result = {success: false, message: "Already downloading spritz", activityId: args.activityId};
	}
	this.locked = true;

	if (args.refresh) {
		future.nest(Utils.rmdir(Config.storagePath + "assets/"));
	} else {
		future.result = true;
	}

	future.then(this, function () {
		future.nest(checkPaths(paths));
	});

	future.then(this, function () {
		var result = future.result;
		Log.debug("Checked paths, result: ", result);
		if (result !== true) {
			Log.log("Could not create directories: ", result);
			this.locked = false;
			outerfuture.result = {success: false, message: "Could not create directories: " + JSON.stringify(result), activityId: args.activityId};
		} else {
			future.nest(checkFiles(filesToLoad));
		}
	});

	future.then(this, function end() {
		var result = future.result;
		Log.debug("Downloaded, result: ", result);
		this.locked = false;
		outerfuture.result = {success: result === true, message: "Done. Result: " + JSON.stringify(result), activityId: args.activityId};
	});
};
