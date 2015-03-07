/*jslint node: true */
/*global fs, Utils, Future, Config, Log, path, libPath, writingArticles: true */

var ImageHandler = require(libPath + "ImageHandler.js");

var DownloadImagesAssistant = function () { "use strict"; };

DownloadImagesAssistant.prototype.run = function (outerfuture) {
	"use strict";
	var args = this.controller.args, articlePath, future = new Future(), articleContent;
	Log.debug("****************** DownloadImagesAssistant ", args);

	if (!args.id) {
		outerfuture.result = {success: false, message: "Need id argument!", activityId: args.activityId};
		return outerfuture;
	}

	if (writingArticles[args.id]) {
		outerfuture.result = {success: false, message: "Already writing " + args.id, activityId: args.activityId};
		return outerfuture;
	}
	writingArticles[args.id] = true;

	articlePath = Utils.getArticlePath(args.id);

	path.exists(articlePath, function (exists) {
		if (exists) {
			future.result = true;
		} else {
			delete writingArticles[args.id];
			outerfuture.result = {success: false, message: "Path not found: " + articlePath, activityId: args.activityId};
		}
	});

	future.then(function readFile() {
		future.getResult(); //consume result.
		fs.readFile(articlePath + Config.contentFilename, function (err, content) {
			if (err) {
				delete writingArticles[args.id];
				outerfuture.result = {success: false, message: JSON.stringify(err), activityId: args.activityId};
			} else {
				try {
					articleContent = JSON.parse(content);
				} catch (e) {
					Log.log("Error during parse: " + e.message);
					delete writingArticles[args.id];
					outerfuture.result = {success: false, message: JSON.stringify(e), activityId: args.activityId};
					return;
				}
				future.nest(ImageHandler.checkImages(args.id, articleContent.images, Object.keys(articleContent.images)));
			}
		});
	});

	//store content to update images status
	future.then(function storeContent() {
		future.getResult(); //consume result
		Log.debug("Trying to store ", !!articleContent);
		fs.writeFile(articlePath + Config.contentFilename, JSON.stringify(articleContent), function (err) {
			delete writingArticles[args.id];
			if (err) {
				outerfuture.result = {success: false, message: JSON.stringify(err), activityId: args.activityId};
			} else {
				outerfuture.result = {success: true, id: args.id, activityId: args.activityId};
			}
		});
		Log.debug("File write request send.");
	});
};
