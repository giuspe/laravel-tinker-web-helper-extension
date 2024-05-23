; (async () => {
    try {
        const session = 'session'
        const local = 'local'

        const saveCurrentTinkerCodeBtn = document.querySelector('#saveCurrentCode')
        const feedBackForLocalStorage = document.querySelector('#feedbackLS')
        const listForLocalStorage = document.querySelector('#listLS')
        const debugPanel = document.querySelector('#debugPanel')
        const saveCurrentLocalStorage = document.querySelector('#saveCurrentLS')

        const footerInfo = document.querySelector('.footerInfo')

        let items = {}

        await populateLsItemslist()

        /*
        <-----------Util Functions Start------------------------------------------------------>
        */

        function updateActivityLog(content = '') {
            feedBackForLocalStorage.innerHTML += '<hr />' + content
        }

        function clearActivityLog(content = '') {
            feedBackForLocalStorage.innerHTML = content
        }

        function updateDebugPanel(content = '', append = false) {
            if (append) {
                debugPanel.innerHTML += content
            } else {
                debugPanel.innerHTML = content
            }
        }

        function clearDebugPanel(content = '') {
            if (typeof content !== 'string') {
                content = ''
            }
            updateDebugPanel(content)
        }

        /**
         * Retrieve object from Chrome's Local StorageArea
         * @param {string} key 
         */
        async function getObjectFromExtensionLocalStorage(key) {
            return new Promise((resolve, reject) => {
                try {
                    chrome.storage.local.get(key, function (value) {
                        resolve(value[key]);
                    });
                } catch (ex) {
                    reject(ex);
                }
            });
        };

        /**
         * Save Object in Chrome's Local StorageArea
         * @param {*} obj 
         */
        const saveObjectInLocalStorage = async function (obj) {
            return new Promise((resolve, reject) => {
                try {
                    console.log('saveObjectInLocalStorage')
                    chrome.storage.local.set(obj, function () {
                        resolve();
                    });
                } catch (ex) {
                    console.error('saveObjectInLocalStorage: cannot save!')
                    reject(ex);
                }
            });
        };

        /**
         * Removes Object from Chrome Local StorageArea.
         *
         * @param {string or array of string keys} keys
         */
        const removeObjectFromLocalStorage = async function (keys) {
            return new Promise((resolve, reject) => {
                try {
                    chrome.storage.local.remove(keys, function () {
                        resolve();
                    });
                } catch (ex) {
                    reject(ex);
                }
            });
        };

        async function getActiveTabURL() {
            try {
                const tabs = await chrome.tabs.query({
                    currentWindow: true,
                    active: true,
                })
                return tabs[0]
            } catch (err) {
                console.error('Error occured in getActiveTabURL', err)
            }
        }

        async function getActiveTabDomain() {
            try {
                const tab = await getActiveTabURL()
                console.log(`getActiveTabDomain: url is ${tab.url}`)
                var url = new URL(tab.url)
                var domain = url.hostname
                return domain
            } catch (err) {
                console.error('Error occured in getActiveTabDomain', err)
            }
        }

        // Get all the storage values from the domain to store it in extension's LS
        function getDomainStorageData(typeOfStorage = 'local', filterKey = '') {
            try {
                const selectedStorage =
                    typeOfStorage === 'local' ? localStorage : sessionStorage
                const values = []
                if (selectedStorage) {
                    if (filterKey.length > 0) {
                        console.log(`getDomainStorageData: looking for key: ${filterKey} on storage: ${typeOfStorage}`)
                    }
                    for (let i = 0; i < selectedStorage?.length; i++) {
                        const key = selectedStorage.key(i)
                        if (filterKey.length > 0 && key !== filterKey) {
                            continue;
                        }
                        const selectedStorageObject = {
                            [key]: selectedStorage.getItem(key),
                        }
                        values.push(selectedStorageObject)
                        console.log(`added key: ${key} to values`)
                    }
                }
                console.log(
                    'getDomainStorageData-typeOfStorage-values',
                    typeOfStorage,
                    values?.length || 0
                )
                return values
            } catch (err) {
                console.error(
                    'Error occured in getDomainStorageData',
                    typeOfStorage,
                    err
                )
            }
        }

        // Set all the storage values from the extension's LS to the domain's storage
        function setDomainStorageData(typeOfStorage = 'local', targetKey = '', content = '') {
            try {
                console.log(`setDomainStorageData: ${typeOfStorage} > ${targetKey}`)
                const selectedStorage =
                    typeOfStorage === 'local' ? localStorage : sessionStorage
                if (selectedStorage) {
                    console.log(`setDomainStorageData: setting content: ${content}`)
                    selectedStorage.setItem(targetKey, content)
                }
            } catch (err) {
                console.error(
                    'Error occured in setDomainStorageData',
                    typeOfStorage,
                    err
                )
            }
        }

        // Add a value to a specific key array in local storage
        async function setExtensionStorageArrayValue(targetKey = '', domain = '', value = '', innerKey = '') {
            try {
                if (innerKey.length === 0) {
                    innerKey = crypto.randomUUID()
                }

                if (domain.length === 0) {
                    domain = await getActiveTabDomain()
                }
                console.log(`setExtensionStorageArrayValue: ${targetKey} > ${innerKey}`)

                let current = await getExtensionStorageArrayValue(targetKey)
                if (!current || typeof current !== 'object') {
                    console.log(`setExtensionStorageArrayValue: current container for key ${targetKey} is empty`)
                    current = {}
                }

                let domainData = current[domain]
                if (!domainData || typeof domainData !== 'object') {
                    console.log(`setExtensionStorageArrayValue: current domain data for key ${targetKey}@${domain} is empty`)
                    domainData = {}
                }
                console.log(`setExtensionStorageArrayValue: setting new value for domain ${targetKey}@${domain}>${innerKey}`)
                if (value.length > 0) {
                    domainData[innerKey] = value
                } else {
                    delete domainData[innerKey]
                }
                current[domain] = domainData

                console.log(`setExtensionStorageArrayValue: updating ${targetKey} in general storage`)
                console.log(current)

                const persistedValue = {}
                persistedValue[targetKey] = current

                chrome.storage.local.set(persistedValue, function () {
                    console.log(`setExtensionStorageArrayValue: ${targetKey} saved in local storage`)
                });
            } catch (err) {
                console.error(
                    'Error occured in setExtensionStorageArrayValue',
                    typeOfStorage,
                    err
                )
            }
        }

        // Retrieves a value to a specific key array in extension local storage
        async function getExtensionStorageArrayValue(targetKey = '', domain = '', innerKey = '') {
            try {
                let current = await getObjectFromExtensionLocalStorage(targetKey)
                if (!current || typeof current !== 'object') {
                    console.log(`getExtensionStorageArrayValue: current container for key ${targetKey} is empty`)
                    current = {}
                }

                if (domain?.length < 1) {
                    return current
                }

                let domainData = current[domain]
                if (!domainData || typeof domainData !== 'object') {
                    console.log(`getExtensionStorageArrayValue: current domain data for key ${targetKey}@${domain} is empty`)
                    domainData = {}
                }

                if (innerKey?.length > 0) {
                    return domainData[innerKey]
                } else {
                    return domainData
                }
            } catch (err) {
                console.error(
                    'Error occured in getExtensionStorageArrayValue',
                    typeOfStorage,
                    err
                )
            }
        }

        // Retrieves a value from a specific key array in local storage
        async function getDomainStorageArrayValue(typeOfStorage = 'local', targetKey = '', domain = '', innerKey = '') {
            try {
                if (domain.length === 0) {
                    domain = await getActiveTabDomain()
                }
                console.log(`getDomainStorageArrayValue: ${typeOfStorage} @ ${targetKey} > ${innerKey}`)

                chrome.storage.local.get(targetKey, function (value) {
                    let current = value[targetKey]
                    console.log('getDomainStorageArrayValue: current storage is ' + typeof current)
                    console.log(current)
                    if (!current || typeof current !== 'object') {
                        console.log(`getDomainStorageArrayValue: current container for key ${targetKey} is empty`)
                        console.log(current)
                        current = {}
                    }

                    let domainData = current[domain]
                    if (!domainData || typeof domainData !== 'object') {
                        console.log(`getDomainStorageArrayValue: current domain data for key ${targetKey}@${domain} is empty`)
                        console.log(domainData)
                        domainData = {}
                    }
                    console.log('getDomainStorageArrayValue: current domain data is ')
                    console.log(domainData)

                    if (innerKey?.length > 0) {
                        const value = domainData[innerKey]
                    } else {
                        const value = domainData
                    }
                    console.log(`getDomainStorageArrayValue: value retrieved`)
                    console.log(value)

                    return value
                });
            } catch (err) {
                console.error(
                    'Error occured in getDomainStorageArrayValue',
                    typeOfStorage,
                    err
                )
            }
        }

        function clearDomainStorageData(typeOfStorage = 'local') {
            const selectedStorage =
                typeOfStorage === 'local' ? localStorage : sessionStorage
            selectedStorage && selectedStorage?.clear()
        }

        function clearExtensionStorage(typeOfStorage = 'local') {
            chrome.storage.local.remove([typeOfStorage], function () {
                const error = chrome.runtime.lastError
                if (error) {
                    console.error(error)
                }
                console.log(
                    'Cleared Existing Chrome Extension Storage!!',
                    typeOfStorage
                )
            })
        }

        function changeFooterTabStyles(target) {
            let infoTitle = document.querySelector('#infoTitle')
            const allTabs = [infoTitle]
            allTabs.forEach((tab) => {
                if (tab?.id === target) {
                    tab.style.borderBottom = '3px solid black'
                    tab.style.fontWeight = 'bold'
                } else {
                    tab.style.borderBottom = '0px'
                    tab.style.fontWeight = 'normal'
                }
            })
        }

        function showHideFooterTabs(target) {
            let moreinfoContent = document.querySelector('.moreinfoContent')
            const allTabsContent = [
                moreinfoContent,
            ]
            allTabsContent.forEach((tab) => {
                if (tab?.className === target) {
                    tab.style.display = 'block'
                } else {
                    tab.style.display = 'none'
                }
            })
        }

        function setItemList(data) {
            let list = ``
            for (const [key, value] of Object.entries(data)) {
                const label = key.split('::')[1]
                list += `<li class='code-item' id='code-item-${key}'>${label}
                            <div class='actions'>
                                <a href='#' class='preview' data-id='${key}' title='preview'>👁️</a>
                                <a href='#' class='restore' data-id='${key}' title='load'>⬆️</a>
                                <a href='#' class='restore-backup' data-id='${key}' title='load (with backup)'>💾 + ⬆️</a>
                                <a href='#' class='update' data-id='${key}' title='update'>⬇️</a>
                                <a href='#' class='delete' data-id='${key}' title='delete'>🚫</a>
                            </div>
                            <hr />
                        </li>`
            }
            listForLocalStorage.innerHTML = `<ul>${list}</ul>`
        }

        function highlightMatches(search) {
            if (search.length < 3) {
                return
            }
            const inputText = document.getElementById("code-preview-source");
            if (!inputText) {
                return
            }

            const regex = new RegExp(search, 'gi');

            let text = inputText.innerHTML;
            text = text.replace(/(<mark class="highlight">|<\/mark>)/gim, '');

            const newText = text.replace(regex, '<mark class="highlight">$&</mark>');
            inputText.innerHTML = newText;
        }

        async function populateLsItemslist() {
            const activeTab = await getActiveTabURL()
            const tabId = activeTab?.id
            const domain = await getActiveTabDomain()
            items = await getExtensionStorageArrayValue('tinker-web-archive', domain)
            setItemList(items)
            setItemsListeners()
        }

        /*
        <-----------Util Functions End------------------------------------------------------>
        */

        function getLocalStorageValue(key) {
            return localStorage[key]
        }

        function setLocalStorageValue(key, content) {
            localStorage[key] = content
            return true
        }

        async function previewItem(e) {
            const link = e.target;
            const key = link.getAttribute('data-id')

            const elements = document.querySelectorAll('.code-item')
            elements.forEach((element) => {
                element.classList.remove('selected')
            });

            document.getElementById(`code-item-${key}`).classList.add('selected')

            const [domain, tab, tabId] = await getContext()
            const value = await getExtensionStorageArrayValue('tinker-web-archive', domain, key)

            updateDebugPanel(`
                <button type='button' id='close-preview'>close preview</button>
                <pre id='code-preview'><code id='code-preview-source'>${value}</code></pre>
                <button type='button' id='close-preview-bottom'>close preview</button>
            `)
            document.getElementById('close-preview').addEventListener('click', clearDebugPanel, false)
            document.getElementById('close-preview-bottom').addEventListener('click', clearDebugPanel, false)

            hljs.highlightAll()
            const searchKey = document.getElementById('search-key').value
            if (searchKey.length > 2) {
                highlightMatches(searchKey)
            }
            clearActivityLog('Tinker-web content local value was set in preview panel. ✔️')
        }

        async function restoreItem(e) {
            const link = e.target;
            const key = link.getAttribute('data-id')
            const [domain, tab, tabId] = await getContext()
            const value = await getExtensionStorageArrayValue('tinker-web-archive', domain, key)

            await chrome.scripting.executeScript({ target: { tabId: tabId }, func: setLocalStorageValue, args: ['tinker-tool', value] });
            clearActivityLog('Tinker-web content local value was restored. ✔️')
            chrome.tabs.reload(tabId)
        }

        async function deleteItem(e) {
            const link = e.target;
            const key = link.getAttribute('data-id')
            const [domain, tab, tabId] = await getContext()

            await setExtensionStorageArrayValue('tinker-web-archive', domain, '', key)
            clearActivityLog(`Tinker-web content saved item ${key} was removed. ✔️`)

            populateLsItemslist()
        }

        async function updateItem(e) {
            const link = e.target;
            const key = link.getAttribute('data-id')
            const localKey = 'tinker-tool'
            const [domain, tab, tabId] = await getContext()

            const results = await chrome.scripting.executeScript({ target: { tabId: tabId }, func: getLocalStorageValue, args: [localKey] });
            const currentValue = results[0]?.result

            await setExtensionStorageArrayValue('tinker-web-archive', domain, currentValue, key)
            clearActivityLog('Tinker-web current content was updated in current item. ✔️')

            chrome.tabs.reload(tabId)
        }

        async function saveItem(name) {
            const [domain, tab, tabId] = await getContext()

            const content = await getCurrentContent()
            await setExtensionStorageArrayValue('tinker-web-archive', domain, content, Date.now() + '::' + name)
            updateActivityLog('Tinker-web content local value was saved in archive. ✔️')

            populateLsItemslist()
        }

        async function getContext() {
            const activeTab = await getActiveTabURL()
            const domain = await getActiveTabDomain()
            const tabId = activeTab?.id

            return [domain, activeTab, tabId]
        }

        async function getCurrentContent(key = 'tinker-tool') {
            const [domain, tab, tabId] = await getContext()

            const results = await chrome.scripting.executeScript({ target: { tabId: tabId }, func: getLocalStorageValue, args: [key] });
            const currentValue = results[0]?.result
            return currentValue;
        }

        function setItemsListeners() {
            var previewBtns = document.getElementsByClassName('preview');
            if (previewBtns.length > 0) {
                for (var i = 0; i < previewBtns.length; i++) {
                    previewBtns[i].addEventListener('click', previewItem, false)
                }
            }
            var restoreBtns = document.getElementsByClassName('restore');
            if (restoreBtns.length > 0) {
                for (var i = 0; i < restoreBtns.length; i++) {
                    restoreBtns[i].addEventListener('click', restoreItem, false)
                }
            }
            var restoreBackupBtns = document.getElementsByClassName('restore-backup');
            if (restoreBackupBtns.length > 0) {
                for (var i = 0; i < restoreBackupBtns.length; i++) {
                    restoreBackupBtns[i].addEventListener('click', async function (e) {
                        const name = 'backup'
                        await saveItem(name)
                        restoreItem(e)
                    })
                }
            }
            var deleteBtns = document.getElementsByClassName('delete');
            if (deleteBtns.length > 0) {
                for (var i = 0; i < deleteBtns.length; i++) {
                    deleteBtns[i].addEventListener('click', deleteItem, false)
                }
            }
    
            var updateBtns = document.getElementsByClassName('update');
            if (updateBtns.length > 0) {
                for (var i = 0; i < updateBtns.length; i++) {
                    updateBtns[i].addEventListener('click', updateItem, false)
                }
            }
        }

        /*
        <-----------Event Listeners Start------------------------------------------------------>
        */

        document.getElementById('search-key').addEventListener("change", (event) => {
            var toSearch = event.target.value;
            if (toSearch.length > 2) {
                highlightMatches(toSearch)
            }
            for (const [key, value] of Object.entries(items)) {
                if (toSearch.length > 2 && value.indexOf(toSearch) === -1) {
                    document.getElementById(`code-item-${key}`).classList.add('hidden')
                } else {
                    document.getElementById(`code-item-${key}`).classList.remove('hidden')
                }
            }
        });

        saveCurrentTinkerCodeBtn?.addEventListener('click', async () => {
            const name = document.getElementById('save-item-key').value
            if (name?.length < 3) {
                clearActivityLog('please set a name for the preset (3 chars minimum). ❌')
                return
            }
            await saveItem(name)
        })

        saveCurrentLocalStorage?.addEventListener('click', async () => {
            const activeTab = await getActiveTabURL()
            const tabId = activeTab?.id
            console.log('saving current local storage value')
            chrome.scripting.executeScript(
                {
                    target: { tabId: tabId },
                    func: setDomainStorageData,
                    args: [local, "tinker-tool"],
                },
                () => {
                    try {
                        console.log('Saving cuerrent tinker LocalStorage successfull')
                        // feedBackForLocalStorage.innerHTML = 'Saving cuerrent tinker LocalStorage successfull. ✔️'
                        updateActivityLog('Saving cuerrent tinker LocalStorage successfull. ✔️')
                    } catch (err) {
                        console.error(
                            'Error occured in injectionResults of saveCurrentLocalStorage',
                            err
                        )
                    }
                }
            )
        })

        footerInfo.addEventListener('click', (event) => {
            if (event?.target?.id === 'infoTitle') {
                changeFooterTabStyles(event?.target?.id)
                showHideFooterTabs('moreinfoContent')
            }
        })

        /*
        <-----------Event Listeners End------------------------------------------------------>
        */
    } catch (err) {
        console.error('Error occured in global popup.js', err)
    }
})()
