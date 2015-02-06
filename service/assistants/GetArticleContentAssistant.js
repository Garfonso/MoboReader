/*global Future, Utils, path, fs, Log, Config */

var GetArticleContentAssistant = function () { "use strict"; };

GetArticleContentAssistant.prototype.run = function (outerfuture) {
	"use strict";
	var args = this.controller.args, articlePath, future = new Future();

	if (!args.id) {
		outerfuture.result = {success: false, message: "Need id argument!", activityId: args.activityId};
		return outerfuture;
	}

	articlePath = Utils.getArticlePath(args.id);

	path.exists(articlePath, function (exists) {
		if (exists) {
			future.result = true;
		} else {
			outerfuture.result = {success: false, message: "Path not found: " + articlePath, activityId: args.activityId};
		}
	});

	future.then(function readFile() {
		future.getResult(); //consume result.
		fs.readFile(articlePath + Config.contentFilename, function (err, content) {
			var obj;
			if (err) {
				outerfuture.result = {success: false, message: JSON.stringify(err), activityId: args.activityId};
			} else {
				try {
					obj = JSON.parse(content);
				} catch (e) {
					Log.log("Error during parse: " + e.message);
					outerfuture.result = {success: false, message: JSON.stringify(e), activityId: args.activityId};
				}
				outerfuture.result = {success: true, id: args.id, content: obj, activityId: args.activityId};
			}
		});
	});
};
