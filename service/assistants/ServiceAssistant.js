/*global Future, path, Config, fs, log*/

var ServiceAssistant = function () { "use strict"; };

ServiceAssistant.prototype.setup = function () {
	"use strict";
	var outerfuture = new Future();

	//make sure that storage path exists:
	path.exists(Config.storagePath, function (exists) {
		if (!exists) {
			fs.mkdir(Config.storagePath, parseInt("0777", 8), function (error) {
				if (error) {
					log("Could not create storage path, error: ", error);
				}
				outerfuture.result = { returnValue: true };
			});
		} else {
			outerfuture.result = { returnValue: true };
		}
	});

	return outerfuture;
};
