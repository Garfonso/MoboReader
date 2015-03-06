/*jslint node: true */
/*global Future, Utils, path, fs, Log, Config */

var KeepRunningAssistant = function () { "use strict"; };

KeepRunningAssistant.prototype.run = function (outerfuture, subscription) {
	"use strict";
	var args = this.controller.args, seq = 0;
	Log.debug("****************** KeepRunningAssistant ", args);

	function sendPingToApp() {
		try {
			//Log.debug("Pinging app ", seq);
			var future = subscription.get();
			future.result = { seq: seq };
			seq += 1;
			setTimeout(sendPingToApp, 2000);
		} catch (e) {
			Log.log("App wen't away? ", e);
			outerfuture.exception(e);
		}
	}

	sendPingToApp();

	return outerfuture;
};
