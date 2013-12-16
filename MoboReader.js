// initialize jo
jo.load();

var unreadList = new ArticleList();
unreadList.setDefault("<p><strong>No articles loaded, yet</strong></p>");
unreadList.setReadOnly(true);
unreadList.selectEvent.subscribe(function articleSelected(id) {
	//TODO: select article view of right article here!
	joLog("unread selected:", id);
});

// create our view card, notice we're nesting widgets inline
var unreadCard = new joCard([
    new joTitle("Mobo Reader"),
	unreadList
]);

// setup our stack and screen
var stack = new joStack();
var screen = new joScreen(stack);

var x = new joNavbar();
x.setStack(stack);

// put the card on our view stack
stack.push(unreadCard);
