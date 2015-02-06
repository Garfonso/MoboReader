enyo.kind({
	name: "TouchScrollStrategyWithThumbs",
	kind: "enyo.TouchScrollStrategy",
	delayHideThumbs: function () {
		//want my thumbs visible! => JSLint accepted dummy.
		return undefined;
	}
});
