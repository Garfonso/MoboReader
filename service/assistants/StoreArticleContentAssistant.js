/*global fs, Utils */

var StoreArticleContentAssistant = function () { "use strict"; };

var writing = {};

StoreArticleContentAssistant.prototype.run = function (outerfuture) {
	"use strict";
	var args = this.controller.args;

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

	fs.writeFile(Utils.getFileName(args.id), JSON.stringify(args.content), function (err) {
		if (err) {
			outerfuture.result = {success: false, message: JSON.stringify(err), activityId: args.activityId};
		} else {
			outerfuture.result = {success: true, id: args.id, activityId: args.activityId};
		}
		delete writing[args.id];
	});
};
