axios.get('/user_info'+geturl).then((s) => {
    window.usersettings = s.data.settings
    if (!window.usersettings) window.usersettings = {
        uplThreads: 10,
        descTemplate: '',
        darkMode: false
    }
    if (document.readyState !== 'loading')
        fillSettings()
    else
        window.addEventListener('DOMContentLoaded', () => fillSettings())
})

function saveSettings() {
    let newSettings = {
        uplThreads: document.getElementById('settingsUplThreads').value || 10,
        descTemplate: document.getElementById('descTemplate').value,
        darkMode: document.getElementById('darkmodeswitch').checked
    }
    axios.put('/update_settings'+geturl,newSettings).then(() => {
        window.usersettings = newSettings
        fillSettings()
        alert('Settings saved successfully')
    }).catch(axiosErrorHandler)
}

function fillSettings() {
    if (usersettings) {
        document.getElementById('settingsUplThreads').value = usersettings.uplThreads ? usersettings.uplThreads : ''
        document.getElementById('descTemplate').value = usersettings.descTemplate ? usersettings.descTemplate : ''
        document.getElementById('darkmodeswitch').checked = usersettings.darkMode ? true : false
        if (usersettings.darkMode)
            document.getElementsByTagName('body')[0].classList.add('darkmode')
        else
            document.getElementsByTagName('body')[0].classList.remove('darkmode')
    }
}

function fillDescription() {
    document.getElementById('description').value += document.getElementById('descTemplate').value
}