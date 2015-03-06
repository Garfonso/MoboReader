/*global fs, Config, Log, Utils, Future */
var WipeStorageAssistant = function () { "use strict"; };

WipeStorageAssistant.prototype.run = function (outerfuture) {
	"use strict";
	var args = this.controller.args, future = new Future(), dir = Config.storagePath;
	Log.debug("****************** WipeStorageAssistant ", args);

	Utils.rmdir(dir, "assets").then(function (future) {
		var result = future.result;
		if (result !== true) {
			Log.log("Could not delete directory: ", result);
		}
		outerfuture.result = {success: result === true, message: JSON.stringify(result), activityId: args.activityId};
	});
};
