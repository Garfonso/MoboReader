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
            kind: "enyo.PalmService",
            name: "getContent",
            service: "info.mobo.moboreader.storage",
            method: "getArticleContent",
            onResponse: "gotContent",
            onComplete: "dbActivityComplete"
        },
        {
            kind: "enyo.PalmService",
            name: "articleContentExists",
            service: "info.mobo.moboreader.storage",
            method: "articleContentExists",
            onResponse: "gotContent",
            onComplete: "dbActivityComplete"
        },
        {
            kind: "enyo.PalmService",
            name: "storeContent",
            service: "info.mobo.moboreader.storage",
            method: "storeArticleContent",
            onComplete: "dbActivityComplete"
        },
        {
            kind: "enyo.PalmService",
            name: "deleteContent",
            service: "info.mobo.moboreader.storage",
            method: "deleteArticleContent",
            onComplete: "dbActivityComplete"
        },
        {
            kind: "enyo.PalmService",
            name: "wipe",
            service: "info.mobo.moboreader.storage",
            method: "wipeStorage",
            onComplete: "dbActivityComplete"
        },

        {
            kind: "enyo.Signals",
            onArticleOpReturned: "gotContent"
        }
    ],

    create: function () {
        this.inherited(arguments);
        this.isWebos = !!window.PalmSystem;
        this.error("Is webOS: " + this.isWebos);
    },

    storeArticle: function (articleModel, webContent, spritzContent) {
        var id = articleModel.get(articleModel.primaryKey);
        this.activityId += 1;

        if (!webContent || !spritzContent) {
            this.gettingToStore[this.activityId] = {
                id: id,
                webContent: webContent,
                spritzContent: spritzContent,
                getId: this.getContent(articleModel)
            };
        } else {
            this.setDbActivities(this.dbActivities + 1);
            if (this.isWebos) {
                this.$.storeContent.send({
                    id: id,
                    content: {
                        web: webContent,
                        spritz: spritzContent
                    },
                    activityId: this.activityId
                });
            } else {
                this.storage[id] = {
                    web: webContent,
                    spritz: spritzContent
                };
                setTimeout(function(activityId) {
                    this.dbActivityComplete(this, {
                        success: true,
                        id: id,
                        activityId: activityId
                    });
                }.bind(this, this.activityId), 100);
            }
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
                if (this.isWebos) {
                    this.$.storeContent.send({
                        id: obj.id,
                        content: content,
                        activityId: activityId
                    });
                } else {
                    this.storage[obj.id] = content;
                    setTimeout(function() {
                        this.dbActivityComplete(this, {
                            success: true,
                            id: obj.id,
                            activityId: activityId
                        });
                    }.bind(this), 100);
                }
                delete this.gettingToStore[activityId];
            }
        }.bind(this));

        Object.keys(this.gettingToDL).forEach(function (activityId) {
            if (activityId === inEvent.activityId) {
                if (!inEvent.success) {
                    this.gettingToDL[activityId].api.getArticleContent(this.gettingToDL[activityId].model);
                }
            }
        });
    },

    _genericSend: function (articleModel, palmService) {
        var id = articleModel ? articleModel.get(articleModel.primaryKey) : undefined;
        this.activityId += 1;
        this.setDbActivities(this.dbActivities + 1);
        if (this.isWebos) {
            palmService.send({
                id: id,
                activityId: this.activityId
            });
        } else {
            setTimeout(function(activityId) {
                this.dbActivityComplete(this, {
                    success: true,
                    id: id,
                    content: id ? this.storage[id] : undefined,
                    activityId: activityId
                });
            }.bind(this, this.activityId), 100);
        }
        return this.activityId;
    },
    getContent: function (articleModel) {
        return this._genericSend(articleModel, this.$.getContent);
    },
    articleContentExists: function (articleModel) {
        return this._genericSend(articleModel, this.$.articleContentExists);
    },
    deleteContent: function (articleModel) {
        return this._genericSend(articleModel, this.$.deleteContent);
    },
    wipe: function () {
        return this._genericSend(null, this.$.wipe);
    },

    checkAndDownload: function (articleModel, api) {
        var activityId = this.articleContentExists(articleModel);
        this.gettingToDL[activityId] = {
            model: articleModel,
            api: api
        };
    },

    dbActivityComplete: function (inSender, inEvent) {
        this.setDbActivities(this.dbActivities - 1);
        enyo.Signals.send("onArticleOpReturned", inEvent);
    }
});
