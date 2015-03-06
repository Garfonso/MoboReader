/*global Future, path, Config, fs, Log*/

var ServiceAssistant = function () { "use strict"; };

ServiceAssistant.prototype.setup = function () {
	"use strict";
	var outerfuture = new Future();
	Log.debug("****************** ServiceAssistant ", arguments);

	//make sure that storage path exists:
	path.exists(Config.storagePath, function (exists) {
		if (!exists) {
			fs.mkdir(Config.storagePath, parseInt("0777", 8), function (error) {
				if (error) {
					Log.log("Could not create storage path, error: ", error);
				}
				Log.debug("****************** ServiceAssistant done");
				outerfuture.result = { returnValue: true };
			});
		} else {
			Log.debug("****************** ServiceAssistant done");
			outerfuture.result = { returnValue: true };
		}
	});

	return outerfuture;
};
