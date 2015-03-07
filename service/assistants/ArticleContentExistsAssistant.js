/*global Utils, fs, Log, Config, Future, checkResult */
var ArticleContentExistsAssistant = function () { "use strict"; };

function checkForAllImages(obj) {
	"use strict";
	var allOk = true;
	//if no images, i.e. need no image download.
	if (obj.images && Object.keys(obj.images).length > 0) {
		Object.keys(obj.images).forEach(function (img) {
			if (!obj.images[img].done) {
				Log.debug("Image ", obj.images[img], " missing.");
				allOk = false;
			}
		});
	}
	return allOk;
}

function processId(id, resObj) {
	"use strict";
	var future = new Future(), filename;

	filename = Utils.getArticlePath(id) + Config.contentFilename;

	fs.readFile(filename, function (err, content) {
		var obj, imagesFine;
		if (err) {
			resObj[id] = {all: false, message: "IO Error: " + err.message};
			future.result = resObj;
		} else {
			try {
				obj = JSON.parse(content);
			} catch (e) {
				Log.log("Error during parse: " + e.message);
				resObj[id] = {all: false, message: "Error during parse " + e.message};
				future.result = resObj;
				return;
			}
			imagesFine = checkForAllImages(obj);
			Log.debug("Id ", id, " content ok: ", (imagesFine && !!obj.web && !!obj.spritz));
			resObj[id] = {
				web: (!!obj.web),
				spritz: (!!obj.spritz),
				images: imagesFine,
				all: (!!obj.web && !!obj.spritz && imagesFine)
			};
			future.result = resObj;
		}
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
			future.nest(processId(id, result));
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
