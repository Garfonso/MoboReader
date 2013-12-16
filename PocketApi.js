/*jslint newcap: true */
/*global joLog, window, joSubject */

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
	authStartedEvent: new joSubject(this), //emitted when auth has started successful
	authDoneEvent: new joSubject(this), //emitted when auth comes back successful
	authErrorEvent: new joSubject(this),

	components: [

		//get data:
		{
			kind: "enyo.WebService",
			name: "getData",
			url: "https://getpocket.com/v3/get",
			method: "POST",
			handleAs: "json",
			contentType: "application/json; charset=UTF8",
			headers: { "X-Accept": "application/json" },
			timeout: 10000,
			onResponse: "gotData",
			onError: "falsyResult"
		},

		//request auth token
		{
			kind: "enyo.WebService",
			name: "requestAuthToken",
			url: "https://getpocket.com/v3/oauth/request",
			method: "POST",
			handleAs: "json",
			contentType: "application/json; charset=UTF8",
			headers: { "X-Accept": "application/json" },
			timeout: 10000,
			onResponse: "gotAuthToken",
			onError: "falsyAuthResult"
		},

		//request access token
		{
			kind: "enyo.WebService",
			name: "getAccessToken",
			url: "https://getpocket.com/v3/oauth/authorize",
			method: "POST",
			handleAs: "json",
			contentType: "application/json; charset=UTF8",
			headers: { "X-Accept": "application/json" },
			timeout: 10000,
			onResponse: "gotAccessToken",
			onError: "falsyAuthResult"
		}
	],
	init: function () {
		var creds = LocalStorageWrapper.get("credentials"),
			syncState = LocalStorageWrapper.get("syncState");
		if (creds) {
			this.accessToken = creds.accessToken;
			this.username = creds.username;
			console.log("Read cred data: " + JSON.stringify(creds));
		} else {
			console.log("No cred data, need to login!");
			setTimeout(function () {
				console.log("Emitting onNeedAuth signal.");
				//enyo.Signals.send("onNeedAuth", {});
			}, 500);
		}

		if (syncState) {
			this.lastSync = syncState.lastSync || 0;
			this.unsyncedActions = syncState.unsyncedActions || [];
			console.log("Read last syncState: " + JSON.stringify(syncState));
		}
		this.ready = true;

		console.error("Overriding last sync!");
		this.lastSync = 0;
	},

	/**
	 * Sync
	 */
	startSync: function () {
		//TODO: before getting new data sync up unsynced local actions.

		this.getData();
	},
	getData: function () {
		console.log("Sending data request to pocket.com");
		this.$.getData.send({}, {
			postBody: {
				consumer_key: this.consumerKey,
				access_token: this.accessToken,
				since: this.lastSync,
				detailType: "simple",
				contentType: "article",
				sort: "oldest"
			}
		});
	},
	gotData: function (inSender, inEvent) {
		console.log("Got response: " + JSON.stringify(inEvent.data));
		this.lastSync = inEvent.data.since || 0;
		console.log("Read since: " + this.lastSync);

		var key, list = inEvent.data.list, article, newArticles = [];
		if (list) {
			console.log("Got list of new items...");
			for (key in list) {
				console.log("processing: " + key);
				if (list.hasOwnProperty(key)) {
					article = list[key];

					console.log("Content: " + JSON.stringify(article));

					newArticles.push({
						id: article.item_id,
						url: article.given_url,
						title: article.resolved_title || article.given_title,
						fav: article.favorite === "1",
						doDelete: article.status !== "0", //2 => delete, 1 => archive.
						images: article.images,
						body: article.excerpt
					});
				} else {
					console.log("hhh....???");
				}
			}

			console.log("Now have " + newArticles.length + " new items.");
		}

		enyo.Signals.send("onSyncDone", {newArticles: newArticles});
	},
	saveSyncState: function () {
		LocalStorageWrapper.set("syncState", {
			lastSync: this.lastSync,
			unsyncedActions: this.unsyncedActions
		});
	},
	falsyResult: function (inSender, inEvent) {
		console.log("Got falsy response!");
		enyo.Signals.send("onSyncDone", {});
		console.log("In Data: " + JSON.stringify(inEvent.data || inEvent));
	},

	/**
	 * Authorization
	 */
	startAuth: function () {
		delete this.access_token; //remove old token..?
		this.$.requestAuthToken.send({}, {
			postBody: {
				consumer_key: this.consumerKey,
				redirect_uri: this.redirectUri
			}
		});
	},
	gotAuthToken: function (inSender, inEvent) {
		console.log("Got response: " + JSON.stringify(inEvent.data));
		this.authToken = inEvent.data.code || inEvent.data;
		console.log("Set authToken to: " + this.authToken);

		window.open("https://getpocket.com/auth/authorize?request_token=" + this.authToken + "&redirect_uri=" + this.redirectUri);
		//TODO: display some button to tap on... hm.
		console.log("Request send to pocket.com. Now login with browser and grant authentication for app. After that, close browser and come back here. Tap finish sign in button.");
	},
	continueAuth: function () {
		this.$.getAccessToken.send({}, {
			postBody: {
				consumer_key: this.consumerKey,
				code: this.authToken
			}
		});
	},
	gotAccessToken: function (inSender, inEvent) {
		console.log("Got response: " + JSON.stringify(inEvent.data));
		this.accessToken = inEvent.data.access_token || inEvent.data;
		this.username = inEvent.data.username || inEvent.data;
		console.log("Set accessToken to: " + this.accessToken);
		console.log("Set username to: " + this.username);

		//now store token and username in local store:
		LocalStorageWrapper.set("credentials", {
			accessToken: this.accessToken,
			username: this.username
		});

		enyo.Signals.send("onAuthDone", {});
	},
	falsyAuthResult: function (inSender, inEvent) {
		console.log("Got falsy auth response!");
		enyo.Signals.send("onAuthError", {});
		console.log("In Data: " + JSON.stringify(inEvent.data || inEvent));
	}
};

jo.loadEvent.subscribe(PocketApi.init, PocketApi);