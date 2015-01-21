/*global Utils, fs */

var DeleteArticleContentAssistant = function () { "use strict"; };

DeleteArticleContentAssistant.prototype.run = function (outerfuture) {
	"use strict";
	var args = this.controller.args, filename;

	if (!args.id) {
		outerfuture.result = {success: false, message: "Need id argument!", activityId: args.activityId};
		return outerfuture;
	}

	filename = Utils.getFileName(args.id);

	fs.unlink(filename, function (err) {
		if (err) {
			outerfuture.result = {success: false, message: JSON.stringify(err), activityId: args.activityId};
		} else {
			outerfuture.result = {success: true, id: args.id, activityId: args.activityId};
		}
	});
};
