/*global Utils, fs, Log, Config*/
var ArticleContentExistsAssistant = function () { "use strict"; };

ArticleContentExistsAssistant.prototype.run = function (outerfuture) {
	"use strict";
	var args = this.controller.args, filename;

	if (!args.id) {
		outerfuture.result = {success: false, message: "Need id argument!", activityId: args.activityId};
		return outerfuture;
	}

	filename = Utils.getArticlePath(args.id) + Config.contentFilename;

	fs.readFile(filename, function (err, content) {
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
			Log.debug("Id " + args.id + " dl ok: " + ((!!obj.web) && ((!!obj.spritz) || !args.requireSpritz)));
			outerfuture.result = {
				success: (!!obj.web) && ((!!obj.spritz) || !args.requireSpritz),
				id: args.id,
				activityId: args.activityId
			};
		}
	});
};
