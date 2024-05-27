; (async () => {
    try {
        const saveCurrentTinkerCodeBtn = document.querySelector('#saveCurrentCode')
        const feedBackForLocalStorage = document.querySelector('#feedbackLS')
        const snippetsListTable = document.getElementById('snippets-table-body')
        const debugPanel = document.querySelector('#debugPanel')
        const exportBtn = document.querySelector('#export')

        const footerInfo = document.querySelector('.footerInfo')

        let activeItem = null
        let items = {}
        let settings = {}
        const settingsDefaults = {
            tinkerKeyName: 'tinker-tool',
            locale: 'de-DE',
            verboseLogs: false,
            usePortInDomainKey: true,
            highlightStyle: 'stackoverflow-light',
        }

        const iconSuccess = `✔️`
        const iconError = `❌`

        await getSettings()
        setGeneralListeners()
        await populateSnippetsList()
        const settingsAreValid = await checkSettings()

        if (!settingsAreValid) {
            const errMessage = `tinker local storage '${settings.tinkerKeyName}' was not found! please check your settings. ${iconError}`
            console.error(errMessage)
            const lockUi = document.createElement('div')
            lockUi.setAttribute("id", "ui-block")
            document.body.appendChild(lockUi)
            refreshActivityLog(errMessage)
        }

        /*
        <-----------Util Functions Start------------------------------------------------------>
        */

        function appendToActivityLog(content = '') {
            feedBackForLocalStorage.innerHTML += '<hr />' + content
        }

        function refreshActivityLog(content = '') {
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
                        resolve(value[key])
                    })
                } catch (ex) {
                    reject(ex)
                }
            })
        }

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
                let url = new URL(tab.url)
                let domain = url.hostname
                if (settings.usePortInDomainKey) {
                    domain += `--${url.port ? url.port : 80}`
                }
                return domain
            } catch (err) {
                console.error('Error occured in getActiveTabDomain', err)
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
                log(`setExtensionStorageArrayValue: ${targetKey} > ${innerKey}`)

                let current = await getExtensionStorageArrayValue(targetKey)
                if (!current || typeof current !== 'object') {
                    current = {}
                }

                let domainData = current[domain]
                if (!domainData || typeof domainData !== 'object') {
                    domainData = {}
                }

                log(`setExtensionStorageArrayValue: setting new value for domain ${targetKey}@${domain}>${innerKey}`)
                if (value.length > 0) {
                    domainData[innerKey] = value
                } else {
                    delete domainData[innerKey]
                }
                current[domain] = domainData

                log(`setExtensionStorageArrayValue: updating ${targetKey} in general storage`)

                const persistedValue = {}
                persistedValue[targetKey] = current

                chrome.storage.local.set(persistedValue, function () {
                    log(`setExtensionStorageArrayValue: ${targetKey} saved in local storage`)
                })
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
                    log(`getExtensionStorageArrayValue: current container for key ${targetKey} is empty`)
                    current = {}
                }

                if (domain?.length < 1) {
                    return current
                }

                let domainData = current[domain]
                if (!domainData || typeof domainData !== 'object') {
                    log(`getExtensionStorageArrayValue: current domain data for key ${targetKey}@${domain} is empty`)
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
            snippetsListTable.innerHTML = ``

            let sortable = []
            for (let key in data) {
                const timestamp = key.split('::')[0]
                sortable.push([key, timestamp, data[key]])
            }
            const sorted = sortable.sort((a, b) => {
                return b[1] - a[1]
            })

            for (const [key, stamp, value] of sorted) {
                const label = key.split('::')[1]
                const date = new Date(Number(stamp))
                const timestamp = date.toLocaleString(settings.locale)
                const size = formatBytes(value.length)

                const item = document.getElementById('tpl-item-table-row').innerHTML.nodeFromTemplate({ key, label, timestamp, size }, 'tbody')
                snippetsListTable.appendChild(item)
            }
        }

        function highlightMatches(search) {
            if (search.length < 3) {
                return
            }
            const inputText = document.getElementById("code-preview-source")
            if (!inputText) {
                return
            }

            const regex = new RegExp(search, 'gi')

            let text = inputText.innerHTML
            text = text.replace(/(<mark class="highlight">|<\/mark>)/gim, '')

            const newText = text.replace(regex, '<mark class="highlight">$&</mark>')
            inputText.innerHTML = newText
        }

        async function populateSnippetsList() {
            const [domain, tab, tabId] = await getContext()
            items = await getExtensionStorageArrayValue('tinker-web-archive', domain)
            setItemList(items)
            setItemsListeners()
            updateGeneralActions()
        }

        function formatBytes(bytes, decimals = 2) {
            if (!+bytes) return '0 B'

            const k = 1024
            const dm = decimals < 0 ? 0 : decimals
            const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']

            const i = Math.floor(Math.log(bytes) / Math.log(k))

            return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
        }

        function log(msg) {
            if (settings.verboseLogs) {
                console.log(msg)
            }
        }

        async function toClipboard(content) {
            if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(content)
            }
        }

        /*
        <-----------Util Functions End------------------------------------------------------>
        */

        function getLocalStorageValue(key) {
            return localStorage[key]
        }

        function checkLocalStorageKey(key) {
            return (key in localStorage)
        }

        function setLocalStorageValue(key, content) {
            localStorage[key] = content
            return true
        }

        async function previewItem(e) {
            const link = e.target
            const key = link.getAttribute('data-id')

            const parentElement = document.getElementById(`code-item-${key}`)

            if (!activeItem || activeItem != parentElement) {
                setActiveItem(e, e.target)
            }

            const [domain, tab, tabId] = await getContext()
            const value = await getExtensionStorageArrayValue('tinker-web-archive', domain, key)
            updateDebugPanel(document.getElementById('tpl-snippet-preview').innerHTML.template({ value }))
            document.getElementById('copy-to-clipboard').addEventListener('click', function(e) {
                if(!activeItem) {
                    return
                }

                const key = activeItem.getAttribute('data-id')
                const content = items[key]
                toClipboard(content)
                refreshActivityLog(`Current preview code copied to clipboard. ${iconSuccess}`)
            })
            document.getElementById('close-preview').addEventListener('click', clearDebugPanel, false)
            document.getElementById('close-preview-bottom').addEventListener('click', clearDebugPanel, false)

            hljs.highlightAll()
            const searchKey = document.getElementById('search-key').value
            if (searchKey.length > 2) {
                highlightMatches(searchKey)
            }
            debugPanel.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' })
            refreshActivityLog(`Tinker-web content local value was set in preview panel. ${iconSuccess}`)
        }

        async function clipItem(e) {
            const link = e.target
            const key = link.getAttribute('data-id')
            toClipboard(items[key])
            refreshActivityLog(`Snippet code copied to clipboard. ${iconSuccess}`)
        }

        async function restoreItem(e) {
            if (!activeItem) {
                return
            }

            const link = activeItem
            const key = link.getAttribute('data-id')
            const [domain, tab, tabId] = await getContext()
            const value = await getExtensionStorageArrayValue('tinker-web-archive', domain, key)

            await chrome.scripting.executeScript({ target: { tabId: tabId }, func: setLocalStorageValue, args: [settings.tinkerKeyName, value] })

            refreshActivityLog(`Tinker-web content local value was restored. ${iconSuccess}`)
            chrome.tabs.reload(tabId)
        }

        async function deleteItem(e) {
            if (!activeItem) {
                return
            }

            const link = activeItem
            const key = link.getAttribute('data-id')
            const [domain, tab, tabId] = await getContext()

            await setExtensionStorageArrayValue('tinker-web-archive', domain, '', key)
            refreshActivityLog(`Tinker-web content saved item ${key} was removed. ${iconSuccess}`)

            populateSnippetsList()
            clearDebugPanel()
            activeItem = null
            updateGeneralActions()
        }

        async function updateItem(e) {
            if (!activeItem) {
                return
            }

            const link = activeItem
            const key = link.getAttribute('data-id')
            const localKey = settings.tinkerKeyName
            const [domain, tab, tabId] = await getContext()

            const results = await chrome.scripting.executeScript({ target: { tabId: tabId }, func: getLocalStorageValue, args: [localKey] })
            const currentValue = results[0]?.result

            await setExtensionStorageArrayValue('tinker-web-archive', domain, currentValue, key)
            refreshActivityLog(`Tinker-web current content was updated in current item. ${iconSuccess}`)

            populateSnippetsList()
            chrome.tabs.reload(tabId)
        }

        async function renameItem(e) {
            setActiveItem(e)

            const link = activeItem
            const key = link.getAttribute('data-id')
            const localKey = settings.tinkerKeyName
            const [domain, tab, tabId] = await getContext()

            const results = await chrome.scripting.executeScript({ target: { tabId: tabId }, func: getLocalStorageValue, args: [localKey] })
            const currentValue = results[0]?.result

            const label = key.split('::')[1]
            let newName = prompt("Enter a new name for this snippet", label)
            if (!newName) {
                refreshActivityLog(`Sorry, we need a name. ${iconError}`)
            }
            const newKey = `${key.split('::')[0]}::${newName}`

            // delete old item
            await setExtensionStorageArrayValue('tinker-web-archive', domain, '', key)
            log(`newKey is: ${newKey}`)
            saveItem(newKey, currentValue, true)

            refreshActivityLog(`Tinker-web current content was updated in current item. ${iconSuccess}`)
            chrome.tabs.reload(tabId)
        }

        async function saveItem(name, content = '', skipTimestamp = false) {
            const [domain, tab, tabId] = await getContext()

            if (!content) {
                content = await getCurrentContent()
            }
            const prefix = skipTimestamp ? '' : Date.now() + '::'

            await setExtensionStorageArrayValue('tinker-web-archive', domain, content, prefix + name)
            refreshActivityLog(`Tinker-web content local value was saved in archive. ${iconSuccess}`)

            populateSnippetsList()
        }

        function setActiveItem(e, element = '') {
            document.querySelectorAll('.code-item').forEach((element) => {
                element.classList.remove('selected')
            })

            let el = null
            if (element) {
                const key = element.getAttribute('data-id')
                el = document.getElementById(`code-item-${key}`)
            } else {
                el = e.target.parentElement
            }

            if (!el) {
                return
            }

            if (!activeItem || activeItem != el) {
                activeItem = el
                console.log(`setting active item class`)
                el.classList.add('selected')
            } else if (activeItem == el) {
                activeItem = null
            }
            clearDebugPanel()
            updateGeneralActions()
        }

        async function getContext() {
            const activeTab = await getActiveTabURL()
            const domain = await getActiveTabDomain()
            const tabId = activeTab?.id

            return [domain, activeTab, tabId]
        }

        async function getCurrentContent(key = '') {
            if (key.length < 1) {
                key = settings.tinkerKeyName
            }
            const [domain, tab, tabId] = await getContext()

            const results = await chrome.scripting.executeScript({ target: { tabId: tabId }, func: getLocalStorageValue, args: [key] })
            const currentValue = results[0]?.result
            return currentValue
        }

        function updateGeneralActions() {
            const actionButtons = document.querySelectorAll('#actions-general .pure-button')
            const disabledClass = 'pure-button-disabled'
            for (let i = 0; i < actionButtons.length; i++) {
                activeItem ? actionButtons[i].classList.remove(disabledClass) : actionButtons[i].classList.add(disabledClass)
            }
        }

        function setItemsListeners() {
            const rows = document.getElementsByClassName('code-item-label')
            if (rows.length > 0) {
                for (let i = 0; i < rows.length; i++) {
                    rows[i].addEventListener('click', setActiveItem, false)
                    rows[i].addEventListener('dblclick', renameItem, false)
                }
            }
            
            const btnPreview = document.getElementsByClassName('item-preview')
            if (btnPreview.length > 0) {
                for (let i = 0; i < btnPreview.length; i++) {
                    btnPreview[i].addEventListener('click', previewItem, false)
                }
            }
            
            const btnClip = document.getElementsByClassName('item-to-clipboard')
            if (btnClip.length > 0) {
                for (let i = 0; i < btnClip.length; i++) {
                    btnClip[i].addEventListener('click', clipItem, false)
                }
            }

            updateGeneralActions()
        }

        function setGeneralListeners() {
            document.getElementById('action-restore').addEventListener('click', restoreItem, false)
            document.getElementById('action-restore-backup').addEventListener('click', async function (e) {
                const name = 'backup'
                await saveItem(name)
                restoreItem(e)
            }, false)
            document.getElementById('action-delete').addEventListener('click', deleteItem, false)
            document.getElementById('action-update').addEventListener('click', updateItem, false)
        }

        async function exportItems(name = '') {
            if (!name) {
                name = Date.now() + `.tinker-web-helper`
            }
            const content = JSON.stringify(items, null, 4)
            let vLink = document.createElement('a'),
                vBlob = new Blob([content], { type: "octet/stream" }),
                vName = `${name}.json`,
                vUrl = window.URL.createObjectURL(vBlob)
            vLink.setAttribute('href', vUrl)
            vLink.setAttribute('download', vName)
            vLink.click()
        }

        async function getSettings() {
            chrome.storage.sync.get(
                settingsDefaults,
                (items) => {
                    log(`settings are`)
                    log(items)
                    settings = items
                    setHighlightStyle()
                }
            )
        }

        function setHighlightStyle() {

            let cssPath = document.getElementById('highlight-style').href
            log(`current highlight style is: ${cssPath}`)
            if (settings.highlightStyle != 'default') {
                let newStyle = cssPath.replace('default.min.css', `${settings.highlightStyle}.min.css`)
                log(`new highlight style is: ${newStyle}`)
                document.getElementById('highlight-style').href = newStyle
            }
        }

        async function checkSettings() {
            const [domain, tab, tabId] = await getContext()

            const results = await chrome.scripting.executeScript({ target: { tabId: tabId }, func: checkLocalStorageKey, args: [settings.tinkerKeyName] })
            return results[0]?.result
        }

        /*
        <-----------Event Listeners Start------------------------------------------------------>
        */

        document.getElementById('search-key').addEventListener("change", (event) => {
            let toSearch = event.target.value
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
        })

        saveCurrentTinkerCodeBtn?.addEventListener('click', async () => {
            const name = document.getElementById('save-item-key').value
            if (name?.length < 3) {
                refreshActivityLog(`please set a name for the preset (3 chars minimum). ${iconError}`)
                return
            }
            await saveItem(name)
        })

        exportBtn?.addEventListener('click', async () => {
            await exportItems()
        })

        footerInfo.addEventListener('click', (event) => {
            if (event?.target?.id === 'infoTitle') {
                changeFooterTabStyles(event?.target?.id)
                showHideFooterTabs('moreinfoContent')
            }
        })

        document.getElementById('go-to-options').addEventListener('click', function () {
            if (chrome.runtime.openOptionsPage) {
                chrome.runtime.openOptionsPage()
            } else {
                window.open(chrome.runtime.getURL('options.html'))
            }
        })

        /*
        <-----------Event Listeners End------------------------------------------------------>
        */
    } catch (err) {
        console.error('Error occured in global popup.js', err)
    }
})()
