enyo.singleton({
    name: "ArticleContentHandler",
    published: {
        dbActivities: 0,
        isWebos: true
    },
    activityId: 0,
    gettingToStore: {},
    gettingToDL: false,
    storage: {}, //used if not webOS.
    needDL: [],
    checkQueue: [],

    //signals:
    //onArticleOpReturned => success true/false, activityId, content { web, spritz} (optional), id = articleId

    components: [
        {
            kind: "enyo.Signals",
            onArticleOpReturned: "gotContent",
            onArticleDownloaded: "contentDownloaded"
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

        if(this.gettingToDL) {
            if (this.gettingToDL.activityId === inEvent.activityId) {
                if (!inEvent.success) {
                    console.error("Need download: " + this.gettingToDL.model.attributes.item_id);
                    if (!this.downloading || this.downloading === this.gettingToDL.model.attributes.item_id) {
                        console.error("Doing direct.");
                        this.gettingToDL.api.getArticleContent(this.gettingToDL.model);
                        this.downloading = this.gettingToDL.model.attributes.item_id;
                    } else {
                        console.error("Planing for later. Current DL: " + this.downloading);
                        this.needDL.push(this.gettingToDL);
                    }
                } else {
                    this.log("Article ok, don't download.");
                }
                delete this.gettingToDL;
            }
        }
    },

    _genericSend: function (articleModel, method, inParams) {
        var params = inParams || {}, req;

        if (articleModel) {
            if (articleModel.get) {
                params.id = articleModel.get(articleModel.primaryKey);
            } else {
                params.id = articleModel.item_id;
            }
        }

        if (!params.activityId) {
            this.activityId += 1;
            params.activityId = this.activityId;
            this.setDbActivities(this.dbActivities + 1);
        }

        if (this.isWebos) {
            req = new enyo.ServiceRequest({
                service: "info.mobo.moboreader.service",
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
                this.dbActivityComplete(activityId, params.id, this, {
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
        return this._genericSend(articleModel, "articleContentExists", {requireSpritz: moboreader.Prefs.downloadSpritzOnUpdate});
    },
    deleteContent: function (articleModel) {
        return this._genericSend(articleModel, "deleteArticleContent");
    },
    wipe: function () {
        return this._genericSend(null, "wipeStorage");
    },

    checkAndDownload: function (articleModel, api) {
        if (!this.gettingToDL) {
            console.error("Checking: " + articleModel.attributes.item_id);
            var activityId = this.articleContentExists(articleModel);
            this.gettingToDL = {
                model: articleModel,
                api: api,
                activityId: activityId
            };
        } else {
            console.error("Checking LATER: " + articleModel.attributes.item_id);
            this.checkQueue.unshift({
                model: articleModel,
                api: api
            });
        }
    },

    contentDownloaded: function (inSender, inEvent) {
        console.error("Download finished: " + inEvent.model.attributes.item_id);
        this.storeArticle(inEvent.model, inEvent.content.web, inEvent.content.spritz);

        if (this.needDL.length > 0) {
            var obj = this.needDL.shift();
            obj.api.getArticleContent(obj.model);
            this.downloading = obj.model.attributes.item_id;
            console.error("Download started: " + this.downloading);
        } else {
            console.error("all downloads finished.");
            this.downloading = false;
        }
    },

    //this will mix queue a bit up.. hm..
    sendNext: function () {
        var req = this.checkQueue.shift();
        if (req) {
            this.checkAndDownload(req.model, req.api);
        }
    },
    dbActivityComplete: function (activityId, id, inSender, inEvent) {
        this.log("Incomming response: " + inEvent.success + " for id " + activityId);
        this.setDbActivities(this.dbActivities - 1);
        inEvent.activityId = activityId;
        inEvent.id = id;
        enyo.Signals.send("onArticleOpReturned", inEvent);
        this.sendNext();
    },
    dbError: function (activityId, id, inSender, inEvent) {
        console.error("dbFailed: " + JSON.stringify(inEvent));
        this.setDbActivities(this.dbActivities - 1);
        enyo.Signals.send("onArticleOpReturned", {
            id: id,
            success: false,
            activityId: activityId
        });
        this.sendNext();
    }
});
