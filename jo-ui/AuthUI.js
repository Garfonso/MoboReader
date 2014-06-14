/*global
    alert,
    App,
    joButton,
    joCache,
    joCard,
    joDivider,
    joFlexcol,
    joLabel,
    joTitle,
    log,
    PocketApi
*/

//==================== Button Callbacks: ==============================
var startAuthCB = function () {
    "use strict";
    log("Starting auth...");
    PocketApi.startAuth();
    App.stack.push(joCache.get("authFinish"));
};

var finishAuthCB = function () {
    "use strict";
    log("Finishing auth...");
    PocketApi.continueAuth();
    //TODO: start some spinner!
};

//==================== PocketApi Event Callbacks: ==============================

var needAuthCB = function () {
    "use strict";
    log("Need Auth callback.");

    //App.screen.showPopup(joCache.get("authDialog")); //.show();
    App.stack.push(joCache.get("authStart"));
};

PocketApi.needAuthEvent.subscribe(needAuthCB);

var authDoneCB = function (result) {
    "use strict";
    if (result && result.success) {
        App.stack.home();
    } else {
        App.stack.push(joCache.get("authStart"));
        alert("Something went wrong with authorization.");
    }
};

PocketApi.authDoneEvent.subscribe(authDoneCB);

//==================== UI Elements ==============================
joCache.set("authStart", function () {
    "use strict";
    /*jslint newcap: true */

    var authDialog = new joCard(new joFlexcol([
            new joTitle("Authorization required"),
            new joDivider(),
            new joLabel("MoboReader needs to be connected to your account. Press button below to open a new browser window pointed at getpocket.com, then login and follow the steps it shows to give access to this app."),
            new joDivider(),
            new joButton("Start authorization").selectEvent.subscribe(startAuthCB)
        ]));

    return authDialog;
});

joCache.set("authFinish", function () {
    "use strict";
    /*jslint newcap: true */

    var authDialog = new joCard(new joFlexcol([
            new joTitle("Authorization"),
            new joDivider(),
            new joLabel("If you did give access to this app and devices on getpocket.com, please press the button below."),
            new joDivider(),
            new joButton("Finish authorization").selectEvent.subscribe(finishAuthCB),
            new joDivider(),
            new joLabel("If something went wront (like you accidentially closed the opened browser), please start over with autorization below:"),
            new joDivider(),
            new joButton("Start over").selectEvent.subscribe(startAuthCB)
        ]));

    return authDialog;
});
