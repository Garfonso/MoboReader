/*jslint newcap: true */
/*global
    log,
    PocketApi,
    ArticleList,
    jo,
    joButton,
    joCache,
    joCard,
    joDialog,
    joDivider,
    joFlexcol,
    joHTML,
    joLabel,
    joNavbar,
    joScreen,
    joStack,
    joStackScroller,
    joTitle,
    joToolbar
*/

var App = {
    /* kind of constructor */
    init: function () {
        "use strict";
        /*jslint newcap: true */

        //initialize stuff:
        jo.load();
        PocketApi.init();

        //list for unread articles.
        this.unreadList = new ArticleList();
        this.unreadList.setDefault("<p><strong>No articles loaded, yet</strong></p>");
        this.unreadList.setReadOnly(true);
        this.unreadList.selectEvent.subscribe(this.articleSelected.bind(this));

        // create our view card, notice we're nesting widgets inline
        this.unreadCard = new joCard(new joFlexcol([
            this.unreadList
        ]));
        this.unreadCard.setTitle("Unread articles");

        // setup our stack and screen
        this.screen = new joScreen(new joFlexcol([
            this.navbar = new joNavbar(),
            this.stack = new joStackScroller(),
            this.toolbar = new joToolbar("Bottom toolbar, yeah.")
        ]));

        this.navbar.setStack(this.stack);

        // put the card on our view stack
        this.stack.push(this.unreadCard);

        PocketApi.needAuthEvent.subscribe(this.needAuthCB.bind(this));
    },

    articleSelected: function (id) {
        "use strict";
        //TODO: select article view of right article here!
        log("unread selected:", id);
    },

    //==================== authorization: ==============================
    needAuthCB: function () {
        "use strict";
        log("Need Auth callback.");

        App.screen.showPopup(joCache.get("authDialog")); //.show();
    }

};

joCache.set("authDialog", function () {
    "use strict";
    /*jslint newcap: true */

    var authDialog = //new NonHidableShim([
        new joDialog(new joFlexcol([
            new joTitle("Authorization required"),
            new joDivider(),
            new joLabel("MoboReader needs to be connected to your account. Press button below to open getpocket.com, login and give access to this app."),
            new joDivider(),
            new joButton("Start authorization")
        ]));
    //joDialog.setStyle("height: 90%;");
    //]);
    authDialog.lastParent = App.stack;

    return authDialog;
});