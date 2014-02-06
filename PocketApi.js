/*jslint newcap: true */
/*global jo, log, debug, window, XMLHttpRequest, LocalStorageWrapper, setTimeout, joSubject */

var PocketApi = {
    accessToken: "blub", //user authentication, get via oauth or whatever. Need to figure that one out. Store it somewhere save
    lastSync: 0, //timestamp of the last sync => Store it somewhere save.
    unsyncedActions: [],

    redirectUri: "http://www.mobo.info/pocket_complete.html",
    authToken: false, //only used during authentication

    consumerKey: "21005-ded74cb03e611ba462973e00",

    username: "", //only stored for informational value, like showing the user what user is logged in.

    syncDoneEvent: new joSubject(this), //called if sync of article list is complete.
    syncProgressEvent: new joSubject(this), //TODO: implement and specify how data is transferred

    needAuthEvent: new joSubject(this), //emitted when no accessToken is found in localStorage
    authStartedEvent: new joSubject(this), //emitted when auth has started successful, UI should display a message and button.
                                           //should call continueAuth when user finished sign in.
    authDoneEvent: new joSubject(this), //emitted when auth comes back, check success member of data if success or not.
    
    articleContentDownloaded: new joSubject(this), //emitted when article content download did finish.


    //TODO: add timeout mechanism, maybe also retry.
    ajaxCall: function (url, data, successCB, errorCB) {
        "use strict";
        var request = new XMLHttpRequest();
        if (typeof data !== "string") {
            data = JSON.stringify(data);
        }
        
        request.open(data ? "POST" : "GET", url, true);
        request.setRequestHeader("Content-type", "application/json; charset=UTF8");
        request.setRequestHeader("X-Accept", "application/json");
        request.send(data);

        request.onreadystatechange = function () {
            if (request.readyState === 4) { //i.e. finished
                if (request.status === 200) { //success, yeah :)
                    log("Got truthy response:", request.responseText);
                    successCB(JSON.parse(request.responseText));
                } else {
                    log("Error in request to", url, " status code:", request.status, " text:", request.statusText);
                    log("Response text:", request.responseText);
                    if (errorCB) {
                        errorCB(request);
                    }
                }
            }
        };
    },

    init: function () {
        "use strict";
        debug("initializing PocketApi");
        var creds = LocalStorageWrapper.get("credentials"),
            syncState = LocalStorageWrapper.get("syncState");
        if (creds) {
            this.accessToken = creds.accessToken;
            this.username = creds.username;
            debug("Read cred data: ", creds);
        } else {
            log("No cred data, need to login!");
            setTimeout(function () {
                debug("Emitting needAuthEvent.");
                this.needAuthEvent.fire();
            }.bind(this), 500);
        }

        if (syncState) {
            this.lastSync = syncState.lastSync || 0;
            this.unsyncedActions = syncState.unsyncedActions || [];
            debug("Read last syncState: " + JSON.stringify(syncState));
        }
        this.ready = true;

        debug("Overriding last sync!");
        this.lastSync = 0;

        jo.unloadEvent.subscribe(PocketApi.saveSyncState, PocketApi);
    },

    /**
     * Sync
     */
    startSync: function () {
        "use strict";
        //TODO: before getting new data sync up unsynced local actions.

        this.getData();
    },
    getData: function () {
        "use strict";
        debug("Sending data request to pocket.com");

        var data = {
            consumer_key: this.consumerKey,
            access_token: this.accessToken,
            since: this.lastSync,
            detailType: "complete",
            contentType: "article",
            sort: "oldest"
        };
        this.ajaxCall("https://getpocket.com/v3/get", data, this.gotData.bind(this), this.falsyResult.bind(this));
    },
    gotData: function (responseObj) {
        "use strict";
        debug("Got response: ", responseObj);
        this.lastSync = responseObj.since || 0;
        debug("Read since: ", this.lastSync);

        var key, list = responseObj.list, article, newArticles = [];
        if (list) {
            debug("Got list of new items...");
            for (key in list) {
                if (list.hasOwnProperty(key)) {
                    debug("processing: " + key);
                    article = list[key];

                    debug("Content: ", article);

                    newArticles.push({
                        id: article.item_id,
                        url: article.given_url,
                        title: article.resolved_title || article.given_title,
                        fav: article.favorite === "1",
                        doDelete: article.status !== "0", //2 => delete, 1 => archive.
                        images: article.images,
                        excerpt: article.excerpt
                    });
                }
            }

            log("Now have", newArticles.length, "new items.");
        }

        this.syncDoneEvent.fire({newArticles: newArticles});
    },
    saveSyncState: function () {
        "use strict";
        LocalStorageWrapper.set("syncState", {
            lastSync: this.lastSync,
            unsyncedActions: this.unsyncedActions
        });
    },
    falsyResult: function () {
        "use strict";
        log("Got falsy response!");
        this.syncDoneEvent.fire({});
    },

    //article content!
    getArticleContent: function (article) {
        "use strict";
        /*var data = {
            consumer_key: this.consumerKey,
            access_token: this.accessToken,
            url: encodeURIComponent(article.url),
            images: 0,
            videos: 0,
            refresh: 0,
            output: "json"
        };
        debug("Data: ", data);*/
        
        var url = "https://text.readitlater.com/v3beta/text?consumer_key=" + this.consumerKey + "&access_token=" + this.accessToken +
                    "&images=1&videos=0&refresh=0&url=" + encodeURIComponent(article.url) + "&output=json";
        debug("Url: " + url);
        
        this.ajaxCall(url, "", this.gotContent.bind(this, article), this.falsyContentResult.bind(this, article));
    },
    gotContent: function (article, responseObj) {
        "use strict";
        
        log("Got article: ", responseObj);
        
        article.url = responseObj.resolvedUrl || article.url;
        article.host = responseObj.host || article.host;
        article.title = responseObj.title || article.title;
        
        if (responseObj.responseCode !== 200) {
            log("Response code false, expect errors with article...");
        }
        var success = responseObj.article !== undefined && responseObj.article !== "" && responseObj.article !== null;
        
        article.excerpt = responseObj.excerpt || article.excerpt;
        article.images = responseObj.images || article.images;
        
        this.articleContentDownloaded.fire({success: success, article: article, body: responseObj.article});
    },
    falsyContentResult: function (article, error) {
        "use strict";
        log("Could not download ", article);
        log("Error: ", error);
        this.articleContentDownloaded.fire({success: false, article: article});
    },

    /**
     * Authorization
     */
    startAuth: function () {
        "use strict";
        delete this.access_token; //remove old token..?
        var data = {
            consumer_key: this.consumerKey,
            redirect_uri: this.redirectUri
        };
        this.ajaxCall("https://getpocket.com/v3/oauth/request", data, this.gotAuthToken.bind(this), this.falsyAuthResult.bind(this));
    },
    gotAuthToken: function (responseObj) {
        "use strict";
        debug("Got response:", responseObj);
        this.authToken = responseObj.code || responseObj;
        debug("Set authToken to:", this.authToken);

        window.open("https://getpocket.com/auth/authorize?request_token=" + this.authToken + "&redirect_uri=" + this.redirectUri);
        this.authStartedEvent.fire({authToken: this.authToken});
        log("Request send to pocket.com. Now login with browser and grant authentication for app. After that, close browser and come back here. Tap finish sign in button.");
    },
    continueAuth: function () {
        "use strict";
        var data = {
            consumer_key: this.consumerKey,
            code: this.authToken
        };
        this.ajaxCall("https://getpocket.com/v3/oauth/authorize", data, this.gotAccessToken.bind(this), this.falsyAuthResult.bind(this));
    },
    gotAccessToken: function (responseObj) {
        "use strict";
        debug("Got response:", responseObj);
        this.accessToken = responseObj.access_token || responseObj;
        this.username = responseObj.username || responseObj;
        log("Set accessToken to:", this.accessToken);
        log("Set username to:", this.username);

        //now store token and username in local store:
        LocalStorageWrapper.set("credentials", {
            accessToken: this.accessToken,
            username: this.username
        });

        this.authDoneEvent.fire({success: true});
    },
    falsyAuthResult: function (error) {
        "use strict";
        log("Got falsy auth response!");
        log(error);
        this.authDoneEvent.fire({success: false});
    }
};
