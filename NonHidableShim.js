/**
	NonHidableShim
	======

	extends joShim, but is not hidden onClick.

*/

/*jslint newcap: true */
/*global joShim, joEvent, log */

var NonHidableShim = function () {
    "use strict";
	joShim.apply(this, arguments);
};
NonHidableShim.extend(joShim, {
	tagName: "NonHidableShim",

    setEvents: function () {
        "use strict";
        log("Doing nothing in NonHidableShim...");
        joEvent.on(this.container, "mousedown", this.onMouseDown, this);
    },

    onMouseDown: function (e) {
        "use strict";
        joEvent.stop(e);
        log("Ignoring on mouse down!");
    },

    show: function () {
        "use strict";
        log("Show called.");
        joShim.prototype.show.apply(this, arguments);
    }
});
