enyo.kind({
    name: "Api",
    published: {
        needLogin: "",
        accessToken: "",
        lastSync: ""
    },
    unsyncedActivities: [],

    redirectUri: "http://www.mobo.info/pocket_complete.html",
    authToken: false, //only used during authentication

    consumerKey: "21005-ded74cb03e611ba462973e00",

    username: "" //only stored for informational value, like showing the user what user is logged in.
});
