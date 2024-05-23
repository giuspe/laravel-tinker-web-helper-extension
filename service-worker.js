const icons = {
    enabled: "/logo32.png",
    disabled: "/logo32-offline.png"
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    console.log(`index of /tinker is:` + tab.url.indexOf('/tinker'))
    if (tab.url.indexOf('/tinker') < 0) {
        // chrome.browserAction.disable(tabId)
    }
})