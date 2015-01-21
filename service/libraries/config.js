/*global Utils */
/*exported Config, log, debug */

var Config = {
	storagePath: "/media/internal/.moboreader/"
};

var log = Utils.logBase;

/* Simple debug function to print out to console error, error because other stuff does not show up in sys logs.. */
var debug = Utils.logOff;
