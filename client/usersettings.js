axios.get('/user_info'+geturl).then((s) => {
    window.usersettings = s.data.settings
    fillSettings()
})

function saveSettings() {
    let newSettings = {
        uplThreads: document.getElementById('settingsUplThreads').value,
        descTemplate: document.getElementById('descTemplate').value
    }
    axios.put('/update_settings'+geturl,newSettings).then(() => {
        window.usersettings = newSettings
        alert('Settings saved successfully')
    }).catch((e) => {
        if (e.response && e.response.data && e.response.data.error)
            alert(e.response.data.error)
        else
            alert(e.toString())
    })
}

function fillSettings() {
    document.getElementById('settingsUplThreads').value = usersettings.uplThreads ? usersettings.uplThreads : ''
    document.getElementById('descTemplate').value = usersettings.descTemplate ? usersettings.descTemplate : ''
}

function fillDescription() {
    document.getElementById('description').value += document.getElementById('descTemplate').value
}