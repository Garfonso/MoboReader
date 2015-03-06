/*jslint node: true */
/*global fs, Utils, servicePath, Future, Config, Log, path */

var StoreArticleContentAssistant = function () { "use strict"; };

var writing = {};

var nodejsMajorVersion = Number(process.version.match(/^v\d+\.(\d+)/)[1]);
if (nodejsMajorVersion >= 4) {
	var httpClient = require(servicePath + "/libraries/httpClient.js");
} else {
	var httpClient = require(servicePath + "/libraries/httpClient_legacy.js");
}

var getFileEnding = function (images, num) {
	"use strict";
	var img;
	if (!num) {
		//assume single image:
		img = images;
	} else {
		img = images[num];
	}

	if (!img) {
		Log.log("WARNING: Missing image object for ", num, " in ", images);
		return ".jpg";
	}
	if (!img.src) {
		Log.log("WARNING: Image without src??");
		img.src = "INVALID.jpg";
	}

	return img.src.substring(img.src.lastIndexOf("."));
};

var downloadImage = function (id, image) {
	"use strict";
	var options = { headers: {}, binary: true}, imId = image.image_id, future = new Future();
	httpClient.parseURLIntoOptions(image.src, options);

	httpClient.sendRequest(options).then(function requestCallback(f) {
		var result = f.result;
		if (result.returnValue) {
			fs.writeFile(Utils.getArticlePath(id) + imId + getFileEnding(image), result.body, function (err) {
				if (err) {
					Log.log("Writing image ", id, "_", imId, " failed: ", err);
					future.result = false;
				} else {
					future.result = true;
				}
			});
		} else {
			delete result.body;
			Log.log("Download of image ", id, "_", imId, " failed: ", result);
			future.result = false;
		}
	});

	return future;
};

/*
 * Checks if first image of array exists, downloads otherwise, then continues with next image, until array is empty.
 */
var checkImages = function (id, images, keys) {
	"use strict";
	if (!keys.length) {
		Log.debug("No more images, can return now.", keys);
		return new Future(true);
	}
	var future = new Future(), image = images[keys.shift()], imId = image.image_id, imgFilename = Utils.getArticlePath(id) + imId + getFileEnding(images, imId);

	path.exists(imgFilename, function (exists) {
		if (exists) {
			Log.debug("Image ", imgFilename, " already exists: ", exists, ". Check next one.");
			future.nest(checkImages(id, images, keys));
		} else {
			Log.debug("Start download of ", imgFilename);
			downloadImage(id, image).then(function dlCallback(f) {
				Log.debug("Download of ", imgFilename, " done. Result: ", f.result);
				future.nest(checkImages(id, images, keys));
			});
		}
	});

	return future;
};

var replaceImgTags = function (c, articlePath) {
	"use strict";
	var index = 0, searchString = "<!--IMG_", start, end, num, filetype, url;

	index = c.web.indexOf(searchString);
	while (index < c.web.length && index > 0) {
		//first get image number:
		start = index + searchString.length;
		end = c.web.indexOf("-->", start);
		num = c.web.substring(start, end);

		//get filetype:
		Log.debug("Replacing: ", c.web.substring(index, end + 3));
		Log.debug("Num: ", num, " images[num]: ", c.images[num]);
		filetype = getFileEnding(c.images, num);

		if (!c.images[num]) {
			c.images[num] = {src: "INVALID.jpg"};
		}

		//build new url:
		url = articlePath + num + filetype;

		//replace image tag:
		c.web = c.web.replace(searchString + num + "-->", '<div class="RIL_IMG"><img src="' + url + '"><p class="RIL_CAPTION">' + (c.images[num].caption || "") + '</p></div>');

		index = c.web.indexOf(searchString, end); //will be -1 if none found anymore.
	}
};

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

	if (writing[args.id]) {
		outerfuture.result = {success: false, message: "Already writing " + args.id, activityId: args.activityId};
		return outerfuture;
	}
	writing[args.id] = true;

	articlePath = Utils.getArticlePath(args.id);

	path.exists(articlePath, function (exists) {
		if (exists) {
			future.result = true;
		} else {
			fs.mkdir(articlePath, parseInt("0777", 8), function (err) {
				if (err) {
					outerfuture.result = {success: false, message: JSON.stringify(err), activityId: args.activityId};
					delete writing[args.id];
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
			replaceImgTags(args.content, articlePath);
			Log.debug("Replacing done, checking if images are downloaded already.");
			future.nest(checkImages(args.id, args.content.images, Object.keys(args.content.images)));
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
				outerfuture.result = {success: false, message: JSON.stringify(err), activityId: args.activityId};
				delete writing[args.id];
			} else {
				future.result = true;
			}
		});
	});

	//all done
	future.then(function allDone() {
		Log.debug("****************** StoreArticleContentAssistant successful done for ", args.id, " and ", args.activityId);
		outerfuture.result = {success: true, id: args.id, activityId: args.activityId};
		delete writing[args.id];
	});
};
