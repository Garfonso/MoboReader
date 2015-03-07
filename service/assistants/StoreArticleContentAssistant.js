/*jslint node: true */
/*global fs, Utils, libPath, Future, Config, Log, path, writingArticles: true, checkResult */

var StoreArticleContentAssistant = function () { "use strict"; };

var ImageHandler = require(libPath + "ImageHandler.js");

StoreArticleContentAssistant.prototype.run = function (outerfuture) {
	"use strict";
	var args = this.controller.args, articlePath, future = new Future(), articleContent;
	Log.debug("****************** StoreArticleContentAssistant ", args.id, " ", args.activityId, " web: ", !!(args.content && args.content.web), " spritz: ", !!(args.content && args.content.spritz), " images: ", !!(args.content && args.content.images));

	if (!args.id) {
		outerfuture.result = {success: false, message: "Need id argument!", activityId: args.activityId};
		return outerfuture;
	}
	if (!args.content) {
		outerfuture.result = {success: false, message: "Need content argument!", activityId: args.activityId};
		return outerfuture;
	}

	if (writingArticles[args.id]) {
		outerfuture.result = {success: false, message: "Already writing " + args.id, activityId: args.activityId};
		return outerfuture;
	}
	writingArticles[args.id] = true;

	articlePath = Utils.getArticlePath(args.id);

	future.now(function checkPath() {
		path.exists(articlePath, function (exists) {
			if (exists) {
				future.result = true;
			} else {
				fs.mkdir(articlePath, parseInt("0777", 8), function (err) {
					if (err) {
						delete writingArticles[args.id];
						outerfuture.result = {success: false, message: JSON.stringify(err), activityId: args.activityId};
					} else {
						future.result = true;
					}
				});
			}
		});
	});

	future.then(function readFile() {
		Log.debug("Path check result: ", checkResult(future)); //consume result
		fs.readFile(articlePath + Config.contentFilename, function (err, content) {
			if (err) {
				Log.debug("No file, need to create new? ", err.message);
				articleContent = {};
			} else {
				try {
					articleContent = JSON.parse(content);
				} catch (e) {
					Log.log("Error during parse: ", e.message, ". Will re-create whole file");
					articleContent = {};
				}
			}
			future.result = true;
		});
	});

	future.then(function replaceImages() {
		Log.debug("Load result: ", checkResult(future)); //consume result
		if (args.content.web && args.content.images) {
			//<!--IMG_1-->
			ImageHandler.replaceImgTags(args.content, articlePath);
			Log.debug("Replacing done, checking if images are downloaded already.");
			future.nest(ImageHandler.checkImages(args.id, args.content.images, Object.keys(args.content.images)));
		} else {
			Log.debug("No images in article.");
			future.result = true;
		}
	});

	//store content in file:
	future.then(function storeContent() {
		Log.debug("Download images result: ", checkResult(future)); //consume result
		articleContent.web = args.content.web || articleContent.web;
		articleContent.spritz = args.content.spritz || articleContent.spritz;
		articleContent.images = args.content.images || articleContent.images;

		fs.writeFile(articlePath + Config.contentFilename, JSON.stringify(articleContent), function (err) {
			if (err) {
				delete writingArticles[args.id];
				outerfuture.result = {success: false, message: JSON.stringify(err), activityId: args.activityId};
			} else {
				future.result = true;
			}
		});
	});

	//all done
	future.then(function allDone() {
		Log.debug("store content result: ", checkResult(future)); //consume result
		delete writingArticles[args.id];
		Log.debug("****************** StoreArticleContentAssistant successful done for ", args.id, " and ", args.activityId);
		outerfuture.result = {success: true, id: args.id, activityId: args.activityId};
	});
};
