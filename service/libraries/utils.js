/*global Config, console, fs, path, Future, Log */
/*exported Utils*/

var Utils = (function () {
	"use strict";
	return {
		getArticlePath: function (id) {
			if (Config.storagePath.charAt(Config.storagePath.length - 1) !== "/") {
				Config.storagePath += "/";
			}
			return Config.storagePath + id + "/";
		},

		printObj: function (obj, depth) {
			var key, msg = "{";
			if (depth < 5) {
				for (key in obj) {
					if (obj.hasOwnProperty(key)) {
						try {
							msg += " " + key + ": " + JSON.stringify(obj[key]) + ",";
						} catch (e) {
							msg += " " + key + ": " + Utils.printObj(obj[key], depth + 1) + ",";
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
						argsArr[i] = Utils.printObj(argsArr[i], 0);
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

		},

		//from here: https://gist.github.com/tkihira/2367067
		rmdir: function (dir, exceptionDir) {
			var future = new Future();

			fs.readdir(dir, function (err, list) {
				if (err) {
					Log.log("Could not read contents of directory ", dir);
					future.result = err;
				} else {
					var innerFuture = new Future(true);

					list.forEach(function (file) {
						var filename = path.join(dir, file);
						innerFuture.then(function () {
							innerFuture.getResult(); //consume result
							fs.stat(filename, function (err, stats) {
								if (err) {
									Log.log("Could not stat ", filename);
									innerFuture.result = err;
								} else {
									if (file === "." || file === ".." || file === exceptionDir) {
										//skip dir
										innerFuture.result = true;
									} else if (stats.isDirectory()) {
										innerFuture.nest(Utils.rmdir(filename));
									} else {
										fs.unlink(filename, function (err) {
											if (err) {
												Log.log("Could not delete ", filename);
											}
											innerFuture.result = true;
										});
									}
								}
							});
						});
					});

					innerFuture.then(function () {
						future.result = true;
					});
				}
			});

			future.then(function () {
				future.getResult(); //consume result
				if (exceptionDir) {
					//just delete all content.s
					future.result = true;
				} else {
					fs.rmdir(dir, function (err) {
						if (err) {
							Log.log("Could not delete directory ", dir, " because ", err);
						}
						future.result = err || true;
					});
				}
			});
			return future;
		}
	};
}());
