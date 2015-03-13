/*jslint node: true */
/*global Utils, fs, Log, Config, Future, checkResult, libPath */
var ArticleContentExistsAssistant = function () { "use strict"; };

var ImageHandler = require(libPath + "ImageHandler.js");

function checkIfAllImagesExist(obj) {
	"use strict";
	var allOk = true;
	if (!obj) {
		return false;
	}
	//if no images, i.e. need no image download.
	if (obj && obj.images && Object.keys(obj.images).length > 0) {
		Object.keys(obj.images).forEach(function (img) {
			if (!obj.images[img].done && !obj.images[img].unrecoverable) {
				Log.debug("Image ", obj.images[img], " missing.");
				allOk = false;
			}
		});
	}
	return allOk;
}

function processId(id, resObj, requireSpritz) {
	"use strict";
	var future = new Future(), filename, obj;

	filename = Utils.getArticlePath(id) + Config.contentFilename;

	future.now(function loadFile() {
		fs.readFile(filename, function (err, content) {
			if (err) {
				resObj[id] = {all: false, message: "IO Error: " + err.message};
				future.result = false;
			} else {
				try {
					obj = JSON.parse(content);
				} catch (e) {
					Log.log("Error during parse: " + e.message);
					resObj[id] = {all: false, message: "Error during parse " + e.message};
					future.result = false;
					return;
				}
				resObj[id] = {
					web: (!!obj.web),
					spritz: (!!obj.spritz)
				};
				if (!requireSpritz) {
					resObj[id].spritz = true;
				}
				Log.debug("Result before image check: ", resObj[id], "spritz: ", (!!obj.spritz));
				if (obj.images) {
					Log.debug("Having images.");
					future.nest(ImageHandler.checkImages(id, obj.images, null, true));
				} else {
					Log.debug("No images, all fine.");
					future.result = true;
				}
			}
		});
	});

	future.then(function checkAllImages() {
		var exception = future.exception,
			result;
		if (exception) {
			future.result = resObj;
			return;
		}

		result = future.result;
		Log.debug("result from check images: ", result);
		if (!resObj[id]) {
			resObj[id] = {};
		}
		resObj[id].images = checkIfAllImagesExist(obj);
		resObj[id].all = resObj[id].web && resObj[id].spritz && resObj[id].images;
		future.result = resObj;
	});

	return future;
}

ArticleContentExistsAssistant.prototype.run = function (outerfuture) {
	"use strict";
	var args = this.controller.args, filename, ids, future = new Future({}); //go immediately
	Log.debug("****************** ArticleContentExistsAssistant ", args);

	if (!args.id && !args.ids) {
		outerfuture.result = {success: false, message: "Need id or ids argument!", activityId: args.activityId};
		return outerfuture;
	}

	if (args.ids) {
		ids = args.ids;
	} else {
		ids = [];
	}
	if (args.id) {
		ids.push(args.id);
	}

	ids.forEach(function (id) {
		future.then(function () {
			var result = checkResult(future);
			future.nest(processId(id, result, args.requireSpritz));
		});
	});

	future.then(function allCheckedCallback() {
		var result = checkResult(future);
		Log.debug("All checks result: ", result);
		if (result.returnValue !== false) {
			if (args.id && !args.ids) {
				Log.debug("Sending single result.");
				outerfuture.result = {
					success: result[args.id].all,
					id: args.id,
					activityId: args.activityId
				};
			} else {
				Log.debug("Send multiple result.");
				outerfuture.result = {
					success: true,
					activityId: args.activityId,
					idsStatus: result
				};
			}
		} else {
			result.activityId = args.activityId;
			outerfuture.exception = result;
		}
	});
};
