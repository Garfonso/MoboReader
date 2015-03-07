/*jslint node: true */
/*global servicePath, Log, Future, Utils, path,fs */

var nodejsMajorVersion = Number(process.version.match(/^v\d+\.(\d+)/)[1]);
if (nodejsMajorVersion >= 4) {
	var httpClient = require(servicePath + "/libraries/httpClient.js");
} else {
	var httpClient = require(servicePath + "/libraries/httpClient_legacy.js");
}

var ImageHandler = (function () {
	"use strict";

	function getFileEnding(images, num) {
		var img, src;
		if (num === undefined) {
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
		src = img.src;

		if (src.indexOf("?") >= 0) {
			src = src.substring(0, src.indexOf("?"));
			Log.debug("Url truncated to ", src, " from ", img.src);
		}

		return src.substring(src.lastIndexOf("."));
	}

	function downloadImage(id, image) {
		var options = { headers: {}, binary: true}, imId = image.image_id, future = new Future();

		if (typeof image.src !== "string") {
			Log.log("Image without src: ", image);
			future.result = false;
			return future;
		}

		httpClient.parseURLIntoOptions(image.src, options);

		httpClient.sendRequest(options).then(function requestCallback(f) {
			var result = f.result;
			if (result.returnValue) {
				fs.writeFile(Utils.getArticlePath(id) + imId + getFileEnding(image), result.body, function (err) {
					if (err) {
						Log.log("Writing image ", id, "_", imId, " failed: ", err);
						future.result = false;
					} else {
						image.done = true;
						future.result = true;
					}
				});
			} else {
				delete result.body;
				Log.log("Download of image ", id, "_", imId, " failed: ", result);
				if (result.returnCode >= 400 && result.returnCode < 500) {
					Log.debug("Unrecoverable error ", result.returnCode, " don't try again.");
					future.result = true;
				} else {
					future.result = false;
				}
			}
		});

		return future;
	}

	function checkImages(id, images, keys) {
		if (!keys.length || keys.length <= 0) {
			Log.debug("No more images, can return now.", keys);
			return new Future(true);
		}
		var future = new Future(), imIndex = keys.shift(), image = images[imIndex], imId = image.image_id || imIndex, imgFilename = Utils.getArticlePath(id) + imId + getFileEnding(images, imId);

		Log.debug("Image object: ", image);

		if (!image.src || image.src === "INVALID.jpg") {
			//image invalid??
			image.done = true;
			Log.log("Image without or invalid src: ", image, " skipping.");
			return checkImages(id, images, keys);
		}

		path.exists(imgFilename, function (exists) {
			if (exists) {
				Log.debug("Image ", imgFilename, " already exists: ", exists, ". Check next one.");
				image.done = true;
				future.nest(checkImages(id, images, keys));
			} else {
				Log.debug("Start download of ", imgFilename);
				downloadImage(id, image).then(function dlCallback(f) {
					Log.debug("Download of ", imgFilename, " done. Result: ", f.result);
					image.done = !!f.result;
					future.nest(checkImages(id, images, keys));
				});
			}
		});

		return future;
	}

	return {
		/*
		 * Checks if first image of array exists, downloads otherwise, then continues with next image, until array is empty.
		 */
		checkImages: checkImages,

		replaceImgTags: function (c, articlePath) {
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
		}
	};
}());

module.exports = ImageHandler;