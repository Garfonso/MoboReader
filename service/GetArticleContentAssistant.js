var GetArticleContentAssistant = function () {};

GetArticleContentAssistant.prototype.run = function (outerfuture) {
    var args = this.controller.args, filename, future = new Future();

    if (!args.id) {
        outerfuture.result = {success: false, message: "Need id argument!", activityId: args.activityId};
        return outerfuture;
    }

    filename = Utils.getFileName(args.id);

    path.exists(filename, function (exists) {
        if (exists) {
            future.result = true;
        } else {
            outerfuture.result = {success: false, message: "File not found: " + filename, activityId: args.activityId};
        }
    });

    future.then(function readFile() {
        future.getResult(); //consume result.
        fs.readFile(filename, function (err, content) {
            if (err) {
                outerfuture.result = {success: false, message: JSON.stringify(err), activityId: args.activityId};
            } else {
                outerfuture.result = {success: true, id: args.id, content: JSON.parse(content), activityId: args.activityId};
            }
        });
    });
};
