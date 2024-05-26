chrome.runtime.onInstalled.addListener(() => {
    // Page actions are disabled by default and enabled on select tabs
    chrome.action.disable();
  
    // Clear all rules to ensure only our expected rules are set
    chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
      // Declare a rule to enable the action on example.com pages
      let tinkerRule = {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: {pathPrefix: '/tinker'},
          })
        ],
        actions: [
            new chrome.declarativeContent.ShowAction()
        ],
      };
  
      // Finally, apply our new array of rules
      let rules = [tinkerRule];
      chrome.declarativeContent.onPageChanged.addRules(rules);
    });
  });