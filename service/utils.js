var Utils = (function () {
    return {
        getFileName: function (id) {
            if (Config.storagePath.charAt(Config.storagePath.length - 1) !== "/") {
                Config.storagePath += "/";
            }
            return Config.storagePath + id + ".json";
        },

        printObj: function (obj, depth) {
            var key, msg = "{";
            if (depth < 5) {
                for (key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        try {
                            msg += " " + key + ": " + JSON.stringify(obj[key]) + ",";
                        } catch (e) {
                            msg += " " + key + ": " + printObj(obj[key], depth + 1) + ",";
                        }
                    }
                }
                msg[msg.length - 1] = "}";
            } else {
                msg = "...";
            }
            return msg;
        },

        logBase: function () {
            var i, pos, datum, argsArr = Array.prototype.slice.call(arguments, 0),
                data;

            for (i = 0; i < argsArr.length; i += 1) {
                if (typeof argsArr[i] !== "string") {
                    try {
                        argsArr[i] = JSON.stringify(argsArr[i]);
                    } catch (e) {
                        argsArr[i] = printObj(argsArr[i], 0);
                    }
                }
            }

            data = argsArr.join(" ");

            // I want ALL my logs!
            data = data.split("\n");
            for (i = 0; i < data.length; i += 1) {
                datum = data[i];
                if (datum.length < 500) {
                    console.error(datum);
                } else {
                    // Do our own wrapping
                    for (pos = 0; pos < datum.length; pos += 500) {
                        console.error(datum.slice(pos, pos + 500));
                    }
                }
            }
        },

        logOff: function () {

        }
    };
}());
