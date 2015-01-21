/*global fs, Config*/
var WipeStorageAssistant = function () { "use strict"; };

WipeStorageAssistant.prototype.run = function (outerfuture) {
	"use strict";
	var args = this.controller.args;

	fs.rmdir(Config.storagePath, function (err) {
		if (err) {
			outerfuture.exception = {errorCode: 3, message: JSON.stringify(err)};
		} else {
			fs.mkdir(Config.storagePath, parseInt("0777", 8), function (err) {
				if (err) {
					outerfuture.result = {success: false, message: JSON.stringify(err), activityId: args.activityId};
				} else {
					outerfuture.result = {success: true, activityId: args.activityId};
				}
			});
		}
	});
};
