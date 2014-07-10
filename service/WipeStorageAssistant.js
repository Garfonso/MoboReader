var WipeStorageAssistant = function () {};

WipeStorageAssistant.prototype.run = function (outerfuture) {
    var args = this.controller.args;

    fs.rmdir(Config.storagePath, function (err) {
        if (err) {
            outerfuture.exception = {errorCode: 3, message: JSON.stringify(err)};
        } else {
            fs.mkdir(Config.storagePath, 0777, function (err) {
                if (err) {
                    outerfuture.result = {success: false, message: JSON.stringify(err), activityId: args.activityId};
                } else {
                    outerfuture.result = {success: true, activityId: args.activityId};
                }
            });
        }
    });
};
