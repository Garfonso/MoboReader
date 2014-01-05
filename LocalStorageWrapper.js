/*jslint sloppy: true */
/*global localStorage, log */
//credits: http://forums.enyojs.com/discussion/100/enyo-2-0-localstorage-support

var LocalStorageWrapper = {
    /* Set the item with key 'name' */
    set: function (name, obj) {
        if (typeof name === "string") {
            if (typeof obj === "object") {
                localStorage.setItem(name, JSON.stringify(obj));
            } else if (typeof obj === "string") {
                localStorage.setItem(name, obj);
            }
        }
    },

    /* Get the item with the key 'name'. */
    get: function (name) {
        var result;
        if (typeof name === "string") {
            result = localStorage.getItem(name);
        }

        if (typeof result === "string") {
            return JSON.parse(result);
        } else if (typeof result === "object" && result !== null) {
            log("OBJECT: ", result);
            throw "ERROR [Storage.get]: getItem returned an object. Should be a string.";
        } else if (typeof result === "undefined" || result === null) {
            //no entry, that's fine.
            return undefined;
        }
    },

    /* Remove the item with the key 'name'. */
    remove: function (name) {
        if (typeof name === "string") {
            localStorage.removeItem(name);
        } else {
            throw "ERROR [Storage.remove]: 'name' was not a String.";
        }
    },

    /* removes all items from localStorage */
    clear: function () {
        localStorage.clear();
    },

    /* Returns length of all localStorage objects. */
    getSize: function () {
        var i, count = 0;
        for (i = 0; i < localStorage.length; i += 1) {
            count += localStorage.getItem(localStorage.key()).length;
        }
        return count;
    }
};
