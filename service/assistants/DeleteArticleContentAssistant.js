/*global Utils, fs, Log */

var DeleteArticleContentAssistant = function () { "use strict"; };

DeleteArticleContentAssistant.prototype.run = function (outerfuture) {
	"use strict";
	var args = this.controller.args, filename;
	Log.debug("****************** DeleteArticleContentAssistant ", args);

	if (!args.id) {
		outerfuture.result = {success: false, message: "Need id argument!", activityId: args.activityId};
		return outerfuture;
	}

	filename = Utils.getArticlePath(args.id);

	Utils.rmdir(filename).then(function (future) {
		if (future.result !== true) {
			outerfuture.result = {success: false, message: JSON.stringify(future.result), activityId: args.activityId};
		} else {
			outerfuture.result = {success: true, id: args.id, activityId: args.activityId};
		}
	});
};
