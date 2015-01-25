/*jslint node: true */
/*global fs, Config*/
var DownloadSpritzAssistant = function () { "use strict"; };

DownloadSpritzAssistant.prototype.run = function (outerfuture) {
	"use strict";
	var args = this.controller.args;

	//TODO: download spritz.js and jquery.js from spritzinc.
	//TODO: download css file and other assets from spritzinc
	//TODO: modify files so that things are loaded from filesystem.
	fs.writeFile("/media/cryptofs/apps/usr/palm/applications/info.mobo.moboreader/write-test.txt", "Es geht :)", function (err) {
		if (err) {
			console.log("Could not write file: ", err);
		} else {
			console.log("Write successful.");
		}
		outerfuture.result = { returnValue: true };
	});
};
