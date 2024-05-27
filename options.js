// Saves options to chrome.storage
const saveOptions = () => {
    const verboseLogs = document.getElementById('verboseLogs').checked;
    const usePortInDomainKey = document.getElementById('usePortInDomainKey').checked;
    const tinkerKeyName = document.getElementById('tinker-storage-key-name').value;
    const locale = document.getElementById('locale').value;
    const highlightStyle = document.getElementById('highlightStyle').value;

    chrome.storage.sync.set(
        { tinkerKeyName, locale, verboseLogs, highlightStyle, usePortInDomainKey },
        () => {
            const status = document.getElementById('status');
            status.textContent = 'Options saved.';
            setTimeout(() => {
                status.textContent = '';
            }, 750);
        }
    );
};

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
const restoreOptions = () => {
    chrome.storage.sync.get(
        { tinkerKeyName: 'tinker-tool', locale: 'de-DE', verboseLogs: false, highlightStyle: 'stackoverflow-light', usePortInDomainKey: true },
        (items) => {
            document.getElementById('verboseLogs').checked = items.verboseLogs;
            document.getElementById('usePortInDomainKey').checked = items.usePortInDomainKey;
            document.getElementById('tinker-storage-key-name').value = items.tinkerKeyName
            document.getElementById('locale').value = items.locale
            document.getElementById('highlightStyle').value = items.highlightStyle
        }
    );
};

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);