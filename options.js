// Saves options to chrome.storage
const saveOptions = () => {
    // const color = document.getElementById('color').value;
    // const likesColor = document.getElementById('like').checked;
    const tinkerKeyName = document.getElementById('tinker-storage-key-name').value;

    chrome.storage.sync.set(
        // { favoriteColor: color, likesColor: likesColor, tinkerKeyName: tinkerKeyName },
        { tinkerKeyName },
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
        // { favoriteColor: 'red', likesColor: true, tinkerKeyName: 'tinker-tool' },
        { tinkerKeyName: 'tinker-tool' },
        (items) => {
            // document.getElementById('color').value = items.favoriteColor;
            // document.getElementById('like').checked = items.likesColor;
            document.getElementById('tinker-storage-key-name').value = items.tinkerKeyName;
        }
    );
};

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);