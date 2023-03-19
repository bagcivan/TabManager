document.addEventListener('DOMContentLoaded', () => {
    const inputPromptTitle = document.getElementById('input-prompt-title');
    const groupSelect = document.getElementById('group-select');
    const newGroupInput = document.getElementById('new-group-input');
    const inputPromptSubmit = document.getElementById('input-prompt-submit');

    async function getGroups() {
        return new Promise((resolve) => {
            chrome.storage.local.get('tabGroups', (data) => {
                resolve(data.tabGroups || []);
            });
        });
    }

    async function populateGroupSelect() {
        const tabGroups = await getGroups();
        tabGroups.forEach((group) => {
            const option = document.createElement('option');
            option.value = group.name;
            option.textContent = group.name;
            groupSelect.appendChild(option);
        });
    }

    chrome.storage.local.get(['action'], async ({ action }) => {
        if (action === 'addTabToGroup') {
            inputPromptTitle.textContent = 'Select a group to which you want to add the tab:';
            groupSelect.style.display = 'block';
            await populateGroupSelect();
        } else if (action === 'createNewGroup') {
            inputPromptTitle.textContent = 'Enter a name for the new group:';
            newGroupInput.style.display = 'block';
        }
    });

    inputPromptSubmit.addEventListener('click', () => {
        if (groupSelect.style.display === 'block' && groupSelect.value) {
            chrome.storage.local.set({ groupSelectValue: groupSelect.value }, () => {
                window.close();
            });
        } else if (newGroupInput.style.display === 'block' && newGroupInput.value.trim()) {
            chrome.storage.local.set({ newGroupValue: newGroupInput.value.trim() }, () => {
                window.close();
            });
        } else {
            alert('Please select a group or enter a valid group name.');
        }
    });

    newGroupInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            inputPromptSubmit.click();
        }
    });

});

