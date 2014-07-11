var ArticleContentExistsAssistant = function () {};

ArticleContentExistsAssistant.prototype.run = function (outerfuture) {
    var args = this.controller.args, filename, future = new Future();

    if (!args.id) {
        outerfuture.result = {success: false, message: "Need id argument!", activityId: args.activityId};
        return outerfuture;
    }

    filename = Utils.getFileName(args.id);

    fs.readFile(filename, function (err, content) {
        if (err) {
            outerfuture.result = {success: false, message: JSON.stringify(err), activityId: args.activityId};
        } else {
            var obj = JSON.parse(content);
            log("id " + args.id + " needs dl: " + (obj.web && (obj.spritz || !args.requireSpritz)));
            outerfuture.result = {
                success: obj.web && (obj.spritz || !args.requireSpritz),
                id: args.id,
                activityId: args.activityId
            };
        }
    });
};
