enyo.singleton({
    name: "ArticleContentHandler",
    published: {
        dbActivities: 0,
        isWebos: true
    },
    activityId: 0,
    gettingToStore: {},
    gettingToDL: {},
    storage: {}, //used if not webOS.

    //signals:
    //onArticleOpReturned => success true/false, activityId, content { web, spritz} (optional), id = articleId

    components: [
        {
            kind: "enyo.Signals",
            onArticleOpReturned: "gotContent"
        }
    ],

    create: function () {
        this.inherited(arguments);
        this.isWebos = !!window.PalmSystem;
    },

    storeArticle: function (articleModel, webContent, spritzContent) {
        this.activityId += 1;

        if (!webContent || !spritzContent) {
            this.gettingToStore[this.activityId] = {
                model: articleModel,
                webContent: webContent,
                spritzContent: spritzContent,
                getId: this.getContent(articleModel) //getting content from DB to augment it.
            };
        } else {
            this.setDbActivities(this.dbActivities + 1);
            this._genericSend(articleModel, "storeArticleContent", {
                content: {
                    web: webContent,
                    spritz: spritzContent
                },
                activityId: this.activityId
            });
        }
        return this.activityId;
    },
    gotContent: function (inSender, inEvent) {
        Object.keys(this.gettingToStore).forEach(function (activityId) {
            var obj = this.gettingToStore[activityId];
            if (obj.getId === inEvent.activityId) {
                console.log("Got article content!");
                var content = inEvent.content || {};
                content.web = obj.webContent || content.web;
                content.spritz = obj.spritzContent || content.spritz;
                this.setDbActivities(this.dbActivities + 1);

                this._genericSend(obj.model, "storeArticleContent", {
                    content: content,
                    activityId: activityId
                });
                delete this.gettingToStore[activityId];
            }
        }.bind(this));

        Object.keys(this.gettingToDL).forEach(function (activityId) {
            if (parseInt(activityId, 10) === inEvent.activityId) {
                if (!inEvent.success) {
                    this.log("Content missing, download.");
                    this.gettingToDL[activityId].api.getArticleContent(this.gettingToDL[activityId].model);
                } else {
                    this.log("Article ok, don't download.");
                }
            }
        }.bind(this));
    },

    _genericSend: function (articleModel, method, inParams) {
        var params = inParams || {}, req;

        params.id = articleModel ? articleModel.get(articleModel.primaryKey) : undefined;
        if (!params.activityId) {
            this.activityId += 1;
            this.setDbActivities(this.dbActivities + 1);
            params.activityId = this.activityId;
        }

        if (this.isWebos) {
            req = new enyo.ServiceRequest({
                service: "info.mobo.moboreader.storage",
                method: method
            });
            req.response(this.dbActivityComplete.bind(this, params.activityId, params.id));
            req.error(this.dbError.bind(this, params.activityId, params.id));

            req.go(params);
        } else {
            if (params.content) {
                this.storage[params.id] = params.content;
            }
            setTimeout(function(activityId) {
                this.dbActivityComplete(this, {
                    success: true,
                    id: params.id,
                    content: params.id ? this.storage[params.id] : undefined,
                    activityId: activityId
                });
            }.bind(this, this.activityId), 100);
        }
        return this.activityId;
    },
    getContent: function (articleModel) {
        return this._genericSend(articleModel, "getArticleContent");
    },
    articleContentExists: function (articleModel) {
        return this._genericSend(articleModel, "articleContentExists");
    },
    deleteContent: function (articleModel) {
        return this._genericSend(articleModel, "deleteArticleContent");
    },
    wipe: function () {
        return this._genericSend(null, "wipeStorage");
    },

    checkAndDownload: function (articleModel, api) {
        var activityId = this.articleContentExists(articleModel);
        this.gettingToDL[activityId] = {
            model: articleModel,
            api: api
        };
    },

    dbActivityComplete: function (activityId, id, inSender, inEvent) {
        this.log("Incomming response: " + inEvent.success + " for id " + activityId);
        this.setDbActivities(this.dbActivities - 1);
        inEvent.activityId = activityId;
        inEvent.id = id;
        enyo.Signals.send("onArticleOpReturned", inEvent);
    },
    dbError: function (activityId, id, inSender, inEvent) {
        console.error("dbFailed: " + JSON.stringify(inEvent));
        enyo.Signals.send("onArticleOpReturned", {
            id: id,
            success: false,
            activityId: activityId
        });
    }
});
