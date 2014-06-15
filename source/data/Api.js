enyo.kind({
    name: "moboreader.AuthModel",
    kind: "enyo.Model",
    defaultSource: "local",
    defaults: {
        needLogin: true,
        accessToken: "",
        lastSync: 0,
        username: "", //only stored for informational value, like showing the user what user is logged in.
        unsyncedActivities: []
    }
});

enyo.kind({
    name: "moboreader.Ajax",
    kind: "enyo.Ajax",
    contentType: "application/json; charset=UTF8",
    headers: [{"X-Accept": "application/json"}],
    timeout: 180000
});

enyo.kind({
    name: "moboreader.Api",
    published: {
        authModel: ""
    },

    authToken: false, //only used during authentication
    redirectUri: "http://www.mobo.info",
    consumerKey: "21005-ded74cb03e611ba462973e00",

    events: {
        onNeedAuth: "",
        onAuthorized: "",
        onAuthFailed: "",
        onStartActivity: "",
        onEndActivity: ""
    },


    create: function () {
        this.inherited(arguments);

        this.authModel = new moboreader.AuthModel({id: 1});
        this.authModel.fetch({
            success: this.bindSafely("modelFetched"),
            fail: this.bindSafely("modelFetched")
        });
    },
    modelFetched: function () {
        if (this.authModel.get("needLogin")) {
            setTimeout(function () {
                this.doNeedAuth();
                this.startAuth();
            }.bind(this), 1000);
        } else {
            this.log("Adding change listener to model");
            this.authModel.addListener("change", this.bindSafely("storeModel"));
        }
    },
    storeModel: function () {
        if (!this.storing) {
            this.storing = true;
            this.log("Storing model.");
            this.authModel.commit({
                success: this.bindSafely("modelStored"),
                fail: this.bindSafely("modelStored")
            });
        } else {
            this.log("Already storing... wait..");
            setTimeout(this.bindSafely("storeModel"), 1000);
        }
    },
    modelStored: function () {
        this.log("Store came back.");
        this.storing = false;
    },

    /*****************************************************************************************
     ******************* Authorization *******************************************************
     *****************************************************************************************/
    startAuth: function () {
        this.access_token = false;
        var req, data;
        this.log("Starting auth...");

        data = {
            consumer_key: this.consumerKey,
            redirect_uri: this.redirectUri
        };

        req = new moboreader.Ajax({
            url: "https://getpocket.com/v3/oauth/request",
            method: "POST",
            postBody: data
        });

        req.go();
        req.response(this.bindSafely("gotAuthToken"));
        req.error(this.bindSafely("authError"));
    },
    gotAuthToken: function (inSender, inResponse) {
        this.log("Got response: ", inResponse);
        this.authToken = inResponse.code;
        var authWin = window.open("https://getpocket.com/auth/authorize?request_token=" + this.authToken + "&redirect_uri=" + this.redirectUri);

        authWin.onload = function () {
            this.log("location: ", authWin.location);
            if (authWin.location && authWin.location.origin === this.redirectUri) {
                authWin.close();
                this.finishAuth();
            }
        }.bind(this);
    },
    finishAuth: function () {
        var req, data;

        data = {
            consumer_key: this.consumerKey,
            code: this.authToken
        };

        req = new moboreader.Ajax({
            url: "https://getpocket.com/v3/oauth/authorize",
            method: "POST",
            postBody: data
        });

        req.go();
        req.response(this.bindSafely("authFinished"));
        req.error(this.bindSafely("authError"));
    },
    authFinished: function (inSender, inResponse) {
        this.log("auth finished: ", inResponse);
        this.authModel.set("username", inResponse.username);
        this.authModel.set("accessToken", inResponse.access_token);
        this.authModel.set("needLogin", false);
        this.authModel.set("lastSync", 0);
        this.authModel.set("unsyncedActivities", []);
        this.storeModel();

        this.authModel.addListener("change", this.bindSafely("storeModel"));
        this.doAuthorized({"username": inResponse.username});
    },
    authError: function (inSender, inResponse) {
        this.log("Auth error!! ", inResponse);
        this.doAuthFailed({error: true});
    },

    /*****************************************************************************************
     ******************* Article Sync ********************************************************
     *****************************************************************************************/
    downloadArticles: function (collection, slow) {
        var req, data;

        this.doStartActivity();

        data = {
            consumer_key: this.consumerKey,
            access_token: this.authModel.get("accessToken"),
            since: slow ? 0 : this.authModel.get("lastSync"),
            detailType: "complete",
            contentType: "article",
            sort: "oldest"
        };

        req = new moboreader.Ajax({
            url: "https://getpocket.com/v3/get",
            method: "POST",
            postBody: data
        });

        req.go();

        req.response(this.bindSafely("gotArticles", collection));
        req.error(this.bindSafely("downloadFailed"));
    },
    gotArticles: function(collection, inSender, inResponse) {
        var articles = [];

        var key, list = inResponse.list, article;
        if (list) {
            this.log("Got list of new items...");
            for (key in list) {
                if (list.hasOwnProperty(key)) {
                    this.log("processing: " + key);
                    article = list[key];

                    this.log("Content: ", article);


                    if (article.status !== "0") { //2 => delete, 1 => archive. => if not 0, delete.
                        collection.remove(article);
                    } else {
                        articles.push(article);
                    }
                }
            }

            this.log("Now have", articles.length, "new items.");
        }

        collection.merge(articles);
        this.authModel.set("lastSync", inResponse.since || 0);
        this.doEndActivity();
    },

    /*****************************************************************************************
     ******************* Article Content *****************************************************
     *****************************************************************************************/
    getArticleContent: function (articleModel) {
        var req, data;

        this.doStartActivity();

        data = {
            consumer_key: this.consumerKey,
            access_token: this.authModel.get("accessToken"),
            images: 1,
            videos: 0,
            refresh: 0,
            url: articleModel.get("resolved_url"),
            output: "json"
        };

        req = new moboreader.Ajax({url: "https://text.readitlater.com/v3beta/text"});
        req.go(data);

        req.response(this.bindSafely("gotArticleContent", articleModel));
        req.error(this.bindSafely("downloadFailed"));
    },
    gotArticleContent: function (articleModel, inSender, inResponse) {
        articleModel.set("content", inResponse.article);
        articleModel.commit();
        this.doEndActivity();
    },

    /*****************************************************************************************
     ******************* Article Actions *****************************************************
     *****************************************************************************************/
    articleAction: function (articleModel, action, collection) {
        var req, actionObj, actions = this.authModel.get("unsyncedActivities");

        this.doStartActivity();

        actionObj = {
            action: action,
            item_id: articleModel.get("item_id"),
            time: Math.round(Date.now() / 1000)
        };
        this.addNoDuplicates(actions, actionObj);
        this.log("Action: ", actionObj);

        req = new moboreader.Ajax({
            url: "https://getpocket.com/v3/send",
            method: "POST",
            postBody: {
                consumer_key: this.consumerKey,
                access_token: this.authModel.get("accessToken"),
                output: "json",
                actions: actions
            }
        });
        req.go();

        req.response(this.bindSafely("actionSuccess", collection));
        req.error(this.bindSafely("actionFailed", actionObj));
    },
    addNoDuplicates: function (actions, action) {
        var i;
        //check if this action is already happening:
        for (i = actions.length - 1; i >= 0; i -= 1) {
            if (actions[i].item_id === action.item_id &&
                actions[i].action === action.action) {
                //keep the newer one.
                actions.splice(i, 1);
            }
        }
        actions.push(action);
    },
    buildRemoveArray: function (collection, objs) {
        var arr = [];
        collection.records.forEach(function (rec) {
            objs.forEach(function (obj) {
                if (obj.item_id === rec.attributes.item_id) {
                    rec.destroy({
                        success: function () { console.log("Destruction of " + obj.item_id + " success."); }
                    });
                    arr.push(rec);
                }
            });
        });
        return arr;
    },
    actionSuccess: function (collection, inSender, inResponse) {
        var actions = this.authModel.get("unsyncedActivities"), i, successfulActions = [], remActions;
        this.log("Action succeeded: ", inResponse);
        if (inResponse.status === 1) {
            //all actions succeeded!
            remActions = this.buildRemoveArray(collection, actions);
            this.log("Removing: ", remActions);
            collection.remove(remActions);
            this.authModel.set("unsyncedActivities", []);
            this.storeModel();
        } else if (inResponse.action_results) {
            for (i = actions.length - 1; i >= 0; i -= 1) {
                if (inResponse.action_results[i]) {
                    successfulActions.push(actions[i]);
                    actions.splice(i, 1);
                }
            }
            this.storeModel();
            if (successfulActions.length > 0) {
                remActions = this.buildRemoveArray(collection, successfulActions);
                this.log("Removing (partly): ", remActions);
                collection.remove(remActions); //has item_id ;)
            }
        }
        this.doEndActivity();
    },
    actionFailed: function (action, inSender, inResponse) {
        this.log("Article Action failed: ", inResponse);
        var actions = this.authModel.get("unsyncedActivities");

        this.addNoDuplicates(actions, action);
        this.storeModel();
        this.doEndActivity();
    },

    //general failure.
    downloadFailed: function (inSender, inResponse) {
        this.log("Failed to download: ", inResponse);
        this.doEndActivity();
    }
});
