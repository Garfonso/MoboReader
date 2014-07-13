var ArticleContentExistsAssistant = function () {};

ArticleContentExistsAssistant.prototype.run = function (outerfuture) {
    var args = this.controller.args, filename;

    if (!args.id) {
        outerfuture.result = {success: false, message: "Need id argument!", activityId: args.activityId};
        return outerfuture;
    }

    filename = Utils.getFileName(args.id);

    fs.readFile(filename, function (err, content) {
        var obj;
        if (err) {
            outerfuture.result = {success: false, message: JSON.stringify(err), activityId: args.activityId};
        } else {
            try {
                obj = JSON.parse(content);
            } catch (e) {
                log("Error during parse: " + e.message);
                outerfuture.result = {success: false, message: JSON.stringify(e), activityId: args.activityId};
            }
            log("Id " + args.id + " dl ok: " + ((!!obj.web) && ((!!obj.spritz) || !args.requireSpritz)));
            outerfuture.result = {
                success: (!!obj.web) && ((!!obj.spritz) || !args.requireSpritz),
                id: args.id,
                activityId: args.activityId
            };
        }
    });
};
