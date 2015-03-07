/*jslint node: true */
/*global fs, Utils, libPath, Future, Config, Log, path, writingArticles: true */

var StoreArticleContentAssistant = function () { "use strict"; };

var ImageHandler = require(libPath + "ImageHandler.js");

StoreArticleContentAssistant.prototype.run = function (outerfuture) {
	"use strict";
	var args = this.controller.args, articlePath, future = new Future();
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

	future.then(function replaceImages() {
		future.getResult();
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
		future.getResult(); //consume result
		fs.writeFile(articlePath + Config.contentFilename, JSON.stringify(args.content), function (err) {
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
		delete writingArticles[args.id];
		Log.debug("****************** StoreArticleContentAssistant successful done for ", args.id, " and ", args.activityId);
		outerfuture.result = {success: true, id: args.id, activityId: args.activityId};
	});
};
