var ServiceAssistant = function () {};

ServiceAssistant.prototype.run = function (outerfuture) {
    //make sure that storage path exists:
    path.exists(Config.storagePath, function (exists) {
        if (!exists) {
            fs.mkdir(Config.storagePath, 0777, function (error) {
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
