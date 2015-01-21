/*global Future, Utils, path, fs, log */

var GetArticleContentAssistant = function () { "use strict"; };

GetArticleContentAssistant.prototype.run = function (outerfuture) {
	"use strict";
	var args = this.controller.args, filename, future = new Future();

	if (!args.id) {
		outerfuture.result = {success: false, message: "Need id argument!", activityId: args.activityId};
		return outerfuture;
	}

	filename = Utils.getFileName(args.id);

	path.exists(filename, function (exists) {
		if (exists) {
			future.result = true;
		} else {
			outerfuture.result = {success: false, message: "File not found: " + filename, activityId: args.activityId};
		}
	});

	future.then(function readFile() {
		future.getResult(); //consume result.
		fs.readFile(filename, function (err, content) {
			var obj;
			if (err) {
				outerfuture.result = {success: false, message: JSON.stringify(err), activityId: args.activityId};
			} else {
				try {
					obj = JSON.parse(content);
				} catch (e) {
					log("Error during parse: " + e.message);
					outerfuture.result = {success: false, message: JSON.stringify(e), activityId: args.activityId};
				}
				outerfuture.result = {success: true, id: args.id, content: obj, activityId: args.activityId};
			}
		});
	});
};
