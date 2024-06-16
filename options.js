const extensionStorageKey = 'tinker-web-archive'
const exportItemsKey = 'tinker-web-archive-domains'

// Saves options to chrome.storage
const saveOptions = () => {
    const verboseLogs = document.getElementById('verboseLogs').checked;
    const usePortInDomainKey = document.getElementById('usePortInDomainKey').checked;
    const showAllDomains = document.getElementById('showAllDomains').checked;
    const allowEditToOtherDomains = document.getElementById('allowEditToOtherDomains').checked;
    const tinkerKeyName = document.getElementById('tinker-storage-key-name').value;
    const locale = document.getElementById('locale').value;
    const snippetImportAction = document.getElementById('snippetImportAction').value;
    const snippetImportActionMergeStrategy = document.getElementById('snippetImportActionMergeStrategy').value;
    const highlightStyle = document.getElementById('highlightStyle').value;

    chrome.storage.sync.set(
        {
            tinkerKeyName,
            locale,
            verboseLogs,
            highlightStyle,
            usePortInDomainKey,
            showAllDomains,
            allowEditToOtherDomains,
            snippetImportAction,
            snippetImportActionMergeStrategy,
        },
        () => {
            logStatus('Options saved.')
        }
    );
};

const logStatus = (msg, persistent = false, type = 'log', noAnimation = false, raw = false) => {
    const status = document.getElementById('status')

    status.innerHTML = ''

    status.classList.remove('error', 'warning', 'success')
    if (type == 'error') {
        status.classList.add('error')
    } else if (type == 'warning') {
        status.classList.add('warning')
    } else if (type == 'success') {
        status.classList.add('success')
    }

    if (noAnimation) {
        if (raw) {
            status.innerHTML = msg
        } else {
            status.textContent = msg
        }
    } else {
        typeWriter('status', msg)
    }

    if (!persistent) {
        setTimeout(() => {
            status.innerHTML = ''
        }, 2500)
    }
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
const restoreOptions = () => {
    chrome.storage.sync.get(
        {
            tinkerKeyName: 'tinker-tool',
            locale: 'de-DE',
            verboseLogs: false,
            showAllDomains: false,
            allowEditToOtherDomains: false,
            showAllDomainsverboseLogs: false,
            highlightStyle: 'stackoverflow-light',
            usePortInDomainKey: true,
            snippetImportAction: 'merge',
            snippetImportActionMergeStrategy: 'replace-same'
        },
        (items) => {
            document.getElementById('verboseLogs').checked = items.verboseLogs;
            document.getElementById('showAllDomains').checked = items.showAllDomains;
            document.getElementById('allowEditToOtherDomains').checked = items.allowEditToOtherDomains;
            document.getElementById('usePortInDomainKey').checked = items.usePortInDomainKey;
            document.getElementById('tinker-storage-key-name').value = items.tinkerKeyName
            document.getElementById('locale').value = items.locale
            document.getElementById('snippetImportAction').value = items.snippetImportAction
            document.getElementById('snippetImportActionMergeStrategy').value = items.snippetImportActionMergeStrategy
            document.getElementById('highlightStyle').value = items.highlightStyle

            showHideMergeStrategy()
        }
    );
};

const previewImportFile = () => {
    const file = document.getElementById('import').files[0];
    if (!file) {
        return
    }
    let reader = new FileReader()
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result) ?? {}
            const importData = data[exportItemsKey] ?? null
            if (!importData) {
                const msg = `Import file doesn't look good...`
                logStatus(msg, true, 'error')
                return
            }
            const domains = Object.keys(importData)
            logStatus(`json file contains ${domains.length} domain(s)`, true)
            let previewContent = ''
            domains.forEach((domain) => {
                const snippets = importData[domain]
                previewContent += `
                    <li class="import-keys-domain">
                        <input id="import-keys-domain-${domain}" class="import-keys-domain-key" type="checkbox" data-key="${domain}" checked />${domain} (${Object.keys(snippets).length} snippets)
                    </li>
                `
            })
            document.getElementById('import-preview').innerHTML = `<ul>${previewContent}</ul>`
        } catch ({ name, message }) {
            console.error(
                'Error occured in previewImportFile',
                message
            )
            const shortErr = message.slice(0, message.indexOf("\n"));
            console.log(message)
            logStatus(`json file has invalid content! message was: <br/> '${message}'`, true, 'error', true, true)
        }
    }
    reader.readAsText(file);
}
// Imports a .json file of saved snippetts.
const importFile = async () => {
    const file = document.getElementById('import').files[0];

    if (!file) {
        const msg = `Please select a file first...`
        logStatus(msg, true, 'error')
        return
    }
    let reader = new FileReader()
    reader.onload = function (e) {
        const data = JSON.parse(e.target.result) ?? {}
        if (!(data[exportItemsKey] ?? null)) {
            const msg = `Import file doesn't look good, quitting...`
            console.error(msg)
            logStatus(msg, true, 'error')
            return
        }
        setExtensionStorageArrayValue(extensionStorageKey, data[exportItemsKey])
        logStatus('Snippets imported successfully!', true, 'success')
    }
    reader.readAsText(file);
};

// Exports all snippets into a .json file.
const exportFile = async () => {
    const name = Date.now() + `.tinker-web-helper`
    const items = await getObjectFromExtensionLocalStorage(extensionStorageKey)
    const toExport = {}
    toExport[exportItemsKey] = items

    const content = JSON.stringify(toExport, null, 4)
    let vLink = document.createElement('a'),
        vBlob = new Blob([content], { type: "octet/stream" }),
        vName = `${name}.json`,
        vUrl = window.URL.createObjectURL(vBlob)
    vLink.setAttribute('href', vUrl)
    vLink.setAttribute('download', vName)
    vLink.click()

    logStatus(`Snippets were exported to file ${name}.json`, true, 'success')
};

const showHideMergeStrategy = () => {
    const snippetImportAction = document.getElementById('snippetImportAction').value;
    if (snippetImportAction == 'replace') {
        document.getElementById('snippetImportActionMergeStrategyContainer').setAttribute('hidden', true)
    } else {
        document.getElementById('snippetImportActionMergeStrategyContainer').removeAttribute('hidden')
    }
}

const changeActiveMenu = (e) => {
    const clicked = e.target
    
    const menuKey = clicked.getAttribute('data-menu-id')
    document.querySelectorAll('.pure-menu-item').forEach((menuPanel) => {
        menuPanel.classList.remove('pure-menu-selected')
    })
    clicked.classList.add('pure-menu-selected')


    document.querySelectorAll('fieldset.menu').forEach((menuPanel) => {
        menuPanel.classList.add('hidden')
    })
    document.getElementById(`tab-${menuKey}`).classList.remove('hidden')
} 


/* Utility functions */
const getObjectFromExtensionLocalStorage = async (key) => {
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

const autosaveForm = (e) => {
    saveOptions()
}

const setExtensionStorageArrayValue = async (targetKey = '', newValue = '') => {
    try {
        if (!newValue || typeof newValue !== 'object') {
            console.warn('imported value must be an object!')
            return
        }

        const current = await getObjectFromExtensionLocalStorage(extensionStorageKey)
        if (!current || typeof current !== 'object') {
            current = {}
        }

        // here we merge old and new value based on the strategy the user selected in options
        const snippetImportAction = document.getElementById('snippetImportAction').value;
        const snippetImportActionMergeStrategy = document.getElementById('snippetImportActionMergeStrategy').value;

        // filter selected domains
        const newValueFiltered = {}
        const selectedKeys = [...document.querySelectorAll('.import-keys-domain-key:checked')]
        selectedKeys.map(domain => domain.getAttribute('data-key')).forEach((domain) => {
            newValueFiltered[domain] = newValue[domain]
        })

        if (Object.keys(newValueFiltered).length === 0) {
            logStatus(`No domain was selected :(`, true, 'warning')
            return
        }

        let dataToSave = {}
        if (snippetImportAction === 'replace') {
            dataToSave = newValueFiltered
        } else {
            const oldKeys = Object.keys(current)
            const newKeys = Object.keys(newValueFiltered)
            const keys = [...new Set(oldKeys.concat(newKeys))]

            keys.forEach((key) => {
                const oldDomainValues = current[key] ?? null
                const newDomainValues = newValueFiltered[key] ?? null
                if (!oldDomainValues) {
                    dataToSave[key] = newDomainValues
                } else if (!newDomainValues) {
                    dataToSave[key] = oldDomainValues
                } else if (snippetImportActionMergeStrategy === 'keep-same') {
                    // keep old values for conflicting keys
                    dataToSave[key] = Object.assign(newDomainValues, oldDomainValues)
                } else {
                    // replace conflicting keys
                    dataToSave[key] = Object.assign(oldDomainValues, newDomainValues)
                }
            })
        }
        const persistedValue = {}
        persistedValue[extensionStorageKey] = dataToSave

        chrome.storage.local.set(persistedValue, function () {
            log(`setExtensionStorageArrayValue: ${extensionStorageKey} saved in local storage`)
        })
    } catch (err) {
        console.error(
            'Error occured in setExtensionStorageArrayValue',
            err
        )
    }
}

const log = (msg, payload = '') => {
    console.log(msg, payload)
}

const typeWriter = async (containerId, msg, speed = 10) => {
    let i = 0
    while (i < msg.length) {
        document.getElementById(containerId).innerHTML += msg.charAt(i);
        i++;
        await sleep(speed)
    }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* /Utility functions */

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
document.getElementById('import-button').addEventListener('click', importFile);
document.getElementById('import').addEventListener('change', previewImportFile);
document.getElementById('export').addEventListener('click', exportFile);
document.getElementById('snippetImportAction').addEventListener('change', showHideMergeStrategy);

const autosaveItems = document.querySelectorAll('.autosave')
if (autosaveItems.length > 0) {
    for (let i = 0; i < autosaveItems.length; i++) {
        autosaveItems[i].addEventListener('change', autosaveForm);
    }
}

const menus = document.querySelectorAll('.pure-menu-item')
if (menus.length > 0) {
    for (let i = 0; i < menus.length; i++) {
        menus[i].addEventListener('click', changeActiveMenu);
    }
}

document.querySelector('.pure-menu-link[data-menu-id="general"]').click()

logStatus(`
    Welcome to the options page!
    <br/>
    Options are set to auto-save on change.
    <br/>
    You can also use this form to export or import snippets
`, true, 'log', true, true)
