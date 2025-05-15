import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";

export default defineBackground(() => {
	browser.action.onClicked.addListener(() => {
		browser.tabs.create({
			url: browser.runtime.getURL("/home.html"),
		});
	});
});
