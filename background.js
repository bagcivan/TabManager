chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'addTabToGroup',
        title: 'Add tab to group',
        contexts: ['page']
    });

    chrome.contextMenus.create({
        id: 'createNewGroup',
        title: 'Create new group',
        contexts: ['page']
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'addTabToGroup' || info.menuItemId === 'createNewGroup') {
        chrome.storage.local.set({ action: info.menuItemId }, () => {
            chrome.windows.create({
                url: 'input_prompt.html',
                type: 'popup',
                width: 500,
                height: 325,
            });
        });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'addTabToGroup') {
        // ... handle addTabToGroup action
    } else if (request.action === 'createNewGroup') {
        // ... handle createNewGroup action
    }
});

