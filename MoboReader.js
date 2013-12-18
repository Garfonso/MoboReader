/*jslint newcap: true */
/*global jo, ArticleList, joCard, joTitle, joStack, joScreen, joNavbar, joLog */

//initialize stuff:
jo.load();
PocketApi.init();

var unreadList = new ArticleList();
unreadList.setDefault("<p><strong>No articles loaded, yet</strong></p>");
unreadList.setReadOnly(true);
unreadList.selectEvent.subscribe(function articleSelected(id) {
    "use strict";
    //TODO: select article view of right article here!
    log("unread selected:", id);
});

// create our view card, notice we're nesting widgets inline
var unreadCard = new joCard([
    new joTitle("Mobo Reader"),
    unreadList
]);

// setup our stack and screen
var stack = new joStackScroller();
var screen = new joScreen(stack);

var x = new joNavbar();
x.setStack(stack);

// put the card on our view stack
stack.push(unreadCard);

//==================== authorization: ==============================
PocketApi.needAuthEvent.subscribe(function needAuthCB() {
    var authDialog = new joDialog([
        new joFlexcol(
            new joHTML("MoboReader needs to be authorized. Press button below to open getpocket.com, login and give access to this app."),
            new joButton("Start authorization")
        )
    ]);
    authDialog.setTitle("Authoriation required");

    authDialog.show();
});
