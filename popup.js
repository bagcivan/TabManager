// Add event listeners for your UI elements
document.getElementById('new-group-name').addEventListener('keydown', async (event) => {
  if (event.key === 'Enter') {
    const groupNameInput = document.getElementById('new-group-name');
    const groupName = groupNameInput.value.trim();
    if (groupName) {
      console.log('Adding group:', groupName); // Debugging message
      await addGroup(groupName);
      groupNameInput.value = '';
      console.log('Group added:', groupName); // Debugging message
    }
  }
});

document.getElementById('add-current-group-button').addEventListener('click', addCurrentGroup);

async function addTabToGroup(tab, groupName) {
  const tabGroups = await getGroups();
  const group = tabGroups.find(g => g.name === groupName);

  if (group) {
    if (!group.urls.includes(tab.url)) {
      group.urls.push(tab.url);
      await saveGroups(tabGroups);
      displayGroups();
    } else {
      alert('The tab is already in the group.');
    }
  } else {
    alert('Group not found.');
  }
}

async function createNewGroup(tab, groupName) {
  const tabGroups = await getGroups();
  const existingGroup = tabGroups.find(g => g.name === groupName);

  if (!existingGroup) {
    const newGroup = { name: groupName, urls: [tab.url] };
    tabGroups.push(newGroup);
    await saveGroups(tabGroups);
    displayGroups();
  } else {
    alert('A group with the same name already exists.');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const tabs = await new Promise(resolve => chrome.tabs.query({ active: true, currentWindow: true }, resolve));
  const currentTab = tabs[0];
  const action = await new Promise(resolve => chrome.storage.local.get('action', resolve));
  const groupSelectValue = await new Promise(resolve => chrome.storage.local.get('groupSelectValue', resolve));
  const newGroupValue = await new Promise(resolve => chrome.storage.local.get('newGroupValue', resolve));

  if (action.action === 'addTabToGroup' && groupSelectValue.groupSelectValue) {
    await addTabToGroup(currentTab, groupSelectValue.groupSelectValue);
  } else if (action.action === 'createNewGroup' && newGroupValue.newGroupValue) {
    await createNewGroup(currentTab, newGroupValue.newGroupValue);
  }

  // Clear the stored action data and input values
  chrome.storage.local.remove(['action', 'groupSelectValue', 'newGroupValue']);
});

function getGroups() {
  return new Promise((resolve) => {
    chrome.storage.local.get('tabGroups', (data) => {
      resolve(data.tabGroups || []);
    });
  });
}

function saveGroups(tabGroups) {
  console.log('Saving groups:', tabGroups); // Debugging message
  chrome.storage.local.set({ tabGroups });
}

function createGroupHeader(group, groupCollapseStates) {
  const groupHeader = document.createElement('div');
  groupHeader.classList.add('group-header');

  const groupButtons = document.createElement('div');
  groupButtons.classList.add('group-buttons');


  const groupNameElement = document.createElement('div');
  groupNameElement.classList.add('group-name');
  groupNameElement.textContent = group.name;
  groupNameElement.title = "Open URLs as group";
  groupHeader.appendChild(groupNameElement);
  groupNameElement.addEventListener('click', () => {
    openGroup(group.name);
  });

  // Add edit and delete buttons
  const editButton = document.createElement('button');
  editButton.innerHTML = '<i class="fas fa-edit"></i>';
  editButton.classList.add('edit-button');
  editButton.addEventListener('click', () => {
    const newName = prompt('Enter new group name:', group.name);
    if (newName && newName !== group.name) {
      editGroupName(group.name, newName);
    }
  });
  groupButtons.appendChild(editButton);

  const deleteButton = document.createElement('button');
  deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
  deleteButton.classList.add('delete-button');
  deleteButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete this group?')) {
      deleteGroup(group.name);
    }
  });
  groupButtons.appendChild(deleteButton);

  const urlsCollapsible = document.createElement('button');
  urlsCollapsible.innerHTML = groupCollapseStates[group.name] === 'expanded' ? '<i class="fas fa-chevron-up"></i>' : '<i class="fas fa-chevron-down"></i>';
  urlsCollapsible.classList.add('collapsible');
  urlsCollapsible.addEventListener('click', (event) => {
    const urlsContainer = event.target.closest('.group').querySelector('.urls-container');
    groupCollapseStates[group.name] = urlsContainer.style.display === 'none' ? 'expanded' : 'collapsed';
    urlsContainer.style.display = groupCollapseStates[group.name] === 'expanded' ? '' : 'none';

    // Update arrow icon based on the current state
    if (groupCollapseStates[group.name] === 'expanded') {
      urlsCollapsible.innerHTML = '<i class="fas fa-chevron-up"></i>';
    } else {
      urlsCollapsible.innerHTML = '<i class="fas fa-chevron-down"></i>';
    }
  });
  groupButtons.appendChild(urlsCollapsible);

  groupHeader.appendChild(groupButtons)
  return groupHeader;
}

function createUrlsContainer(group, groupCollapseStates) {
  const urlsContainer = document.createElement('div');
  urlsContainer.classList.add('urls-container');
  urlsContainer.style.display = groupCollapseStates[group.name] === 'expanded' ? '' : 'none';

  group.urls.forEach((url) => {
    const urlElement = document.createElement('div');
    urlElement.classList.add('url-item');
    urlElement.setAttribute('draggable', 'true');

    // Add drag event listeners
    urlElement.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', JSON.stringify({ sourceGroup: group.name, url: url }));
      event.dataTransfer.effectAllowed = 'move';
    });

    urlElement.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    });

    urlElement.addEventListener('drop', async (event) => {
      event.preventDefault();
      const sourceData = JSON.parse(event.dataTransfer.getData('text/plain'));
      const targetGroupName = group.name;

      if (sourceData.sourceGroup !== targetGroupName) {
        const tabGroups = await getGroups();

        const sourceGroup = tabGroups.find(g => g.name === sourceData.sourceGroup);
        const targetGroup = tabGroups.find(g => g.name === targetGroupName);

        // Remove the tab from the source group and add it to the target group.
        sourceGroup.urls = sourceGroup.urls.filter(u => u !== sourceData.url);
        targetGroup.urls.push(sourceData.url);

        await saveGroups(tabGroups);
        displayGroups();
      }
    });

    const thumbnail = createThumbnail(url);
    urlElement.appendChild(thumbnail);

    const urlText = document.createElement('span');
    urlText.classList.add('url-text');
    const urlWithProtocol = url.startsWith('http://') || url.startsWith('https://') ? url : 'http://' + url;
    const urlDomain = new URL(urlWithProtocol).hostname;
    urlText.textContent = urlDomain;
    urlText.title = url; // Add this line to show the entire URL on hover
    urlElement.appendChild(urlText);

    const deleteUrlButton = document.createElement('button');
    deleteUrlButton.innerHTML = '<i class="fa-solid fa-minus"></i>';
    deleteUrlButton.classList.add('delete-url-button');
    deleteUrlButton.addEventListener('click', () => {
      deleteUrlFromGroup(group.name, url);
    });
    urlElement.appendChild(deleteUrlButton);

    urlsContainer.appendChild(urlElement);
  });

  return urlsContainer;
}

function createAddUrlInput(group) {
  const addUrlInput = document.createElement('input');
  addUrlInput.type = 'text';
  addUrlInput.placeholder = 'Add URL';
  addUrlInput.classList.add('add-url-input');
  addUrlInput.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
      const url = addUrlInput.value.trim();
      if (isValidUrl(url)) {
        await addUrlToGroup(group.name, url);
        addUrlInput.value = '';
        displayGroups();
      } else {
        alert('Please enter a valid URL.');
      }
    }

  });

  return addUrlInput;
}

function createThumbnail(url) {
  const thumbnail = document.createElement('img');
  thumbnail.classList.add('thumbnail');
  thumbnail.src = `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(url)}`;
  thumbnail.title = url;

  return thumbnail;
}

const createGroupElement = (group, groupCollapseStates) => {
  const groupElement = document.createElement('div');
  groupElement.classList.add('group');

  const groupHeader = createGroupHeader(group, groupCollapseStates);
  groupElement.appendChild(groupHeader);

  const urlsContainer = createUrlsContainer(group, groupCollapseStates);
  groupElement.appendChild(urlsContainer);

  const addUrlInput = createAddUrlInput(group);
  groupElement.appendChild(addUrlInput);

  return groupElement;
};

async function displayGroups() {
  const tabGroups = await getGroups();
  console.log('Displaying groups:', tabGroups);

  const groupsContainer = document.getElementById('groups-container');
  groupsContainer.innerHTML = '';

  tabGroups.forEach((group) => {
    const groupElement = createGroupElement(group, groupCollapseStates);
    groupsContainer.appendChild(groupElement);
  });
}

function isValidUrl(url) {
  const urlPattern = new RegExp(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i);
  return urlPattern.test(url);
}

async function addGroup(groupName) {
  const tabGroups = await getGroups();
  tabGroups.push({ name: groupName, urls: [] });
  await saveGroups(tabGroups);
  await displayGroups();
}

async function editGroupName(oldName, newName) {
  const tabGroups = await getGroups();
  const group = tabGroups.find((g) => g.name === oldName);
  if (group) {
    group.name = newName;
    await saveGroups(tabGroups);
    displayGroups();
  }
}

async function deleteGroup(groupName) {
  const tabGroups = await getGroups();
  const updatedGroups = tabGroups.filter((g) => g.name !== groupName);
  await saveGroups(updatedGroups);
  displayGroups();
}

async function addUrlToGroup(groupName, url) {
  const tabGroups = await getGroups();
  const group = tabGroups.find((g) => g.name === groupName);
  if (group) {
    group.urls.push(url);
    await saveGroups(tabGroups);
    displayGroups();
  }
}

async function deleteUrlFromGroup(groupName, url) {
  const tabGroups = await getGroups();
  const group = tabGroups.find((g) => g.name === groupName);
  if (group) {
    group.urls = group.urls.filter((u) => u !== url);
    await saveGroups(tabGroups);
    displayGroups();
  }
}

async function openGroup(groupName) {
  const tabGroups = await getGroups();
  const group = tabGroups.find((g) => g.name === groupName);
  if (group) {
    const tabs = await Promise.all(group.urls.map((url) => chrome.tabs.create({ url, active: false })));
    const tabIds = tabs.map((tab) => tab.id);
    const groupId = await chrome.tabs.group({ createProperties: { windowId: chrome.windows.WINDOW_ID_CURRENT }, tabIds });
    await chrome.tabGroups.update(groupId, { title: groupName });
  }
}

async function addCurrentGroup() {
  const currentTab = await new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      resolve(tab);
    });
  });

  if (currentTab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE) {
    alert('Current tab is not in a group.');
    return;
  }

  const tabGroup = await new Promise((resolve) => {
    chrome.tabGroups.get(currentTab.groupId, (group) => {
      resolve(group);
    });
  });

  const tabsInGroup = await new Promise((resolve) => {
    chrome.tabs.query({ groupId: currentTab.groupId }, (tabs) => {
      resolve(tabs);
    });
  });

  const groupName = tabGroup.title || 'Untitled Group';
  const urls = tabsInGroup.map((tab) => tab.url);

  const tabGroups = await getGroups();
  if (tabGroups.some((group) => group.name === groupName)) {
    alert('A group with this name already exists.');
    return;
  }

  tabGroups.push({ name: groupName, urls });
  await saveGroups(tabGroups);
  await displayGroups();
}

const groupCollapseStates = {};
displayGroups();



