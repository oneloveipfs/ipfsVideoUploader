// olisc client helper file
let olisc = {
    new: async (op,opNetwork,scheduled) => {
        return await olisc.call('post','/new',{op,opNetwork,scheduled})
    },
    edit: async (id,op,opNetwork,scheduled) => {
        return await olisc.call('put','/edit',{id,op,opNetwork,scheduled})
    },
    delete: async (id) => {
        return await olisc.call('delete','/delete',{id})
    },
    get: async (id) => {
        return await olisc.call('get','/get/'+id,{})
    },
    list: async (filter) => {
        return await olisc.call('post','/list',{filter})
    },
    call: async (verb,method,json) => {
        if (verb !== 'delete')
            return (await axios[verb]('/olisc'+method+geturl,json)).data
        else
            return (await axios[verb]('/olisc'+method+geturl,{ data: json, headers: { 'Content-Type': 'application/json' }})).data
    }
}

let oliscLoaded = {}
let oliscEditor
let jsonEditorLoaded = false

window.olisc = olisc

function handleOliscFilterSelection(selected) {
    switch (selected.selectedIndex) {
        case 0:
            break
        case 1:
            loadOliscList('pending')
            break
        case 2:
            loadOliscList('success')
            break
        case 3:
            loadOliscList('errored')
            break
        default:
            break
    }
}

async function loadOliscList(status) {
    loadEditor()
    let list = await olisc.list({status})
    if (!Array.isArray(list)) return
    let renderer = new TbodyRenderer()
    oliscLoaded = {}
    for (let i in list) {
        renderer.appendRow(
            list[i]._id,
            list[i].operationNetwork,
            list[i].operationNetwork === 'avalon'? ('Type '+list[i].operation.type) : joinGrapheneOps(list[i].operation),
            '<a onclick="viewOliscOp(\''+list[i]._id+'\')">View</a>')
        oliscLoaded[list[i]._id] = list[i]
    }
    document.getElementById('oliscTbody').innerHTML = renderer.renderRow()
}

function joinGrapheneOps(operations) {
    let opNames = []
    for (let op in operations)
        opNames.push(operations[op][0])
    return opNames.join(', ')
}

function viewOliscOp(id) {
    console.log(oliscLoaded[id])
    document.getElementById('oliscID').innerText = 'ID: '+id
    document.getElementById('oliscNetwork').innerText = 'Network: '+oliscLoaded[id].operationNetwork
    document.getElementById('oliscScheduled').innerText = 'Scheduled: '+new Date(oliscLoaded[id].scheduled).toLocaleString()
    document.getElementById('oliscEditor').innerHTML = ''
    oliscEditor = new JSONEditor(document.getElementById('oliscEditor'),{
        mode: 'code',
        modes: ['code', 'text', 'tree', 'view'],
        ace: ace
    })
    oliscEditor.set(oliscLoaded[id].operation)
    document.getElementById('oliscDeleteBtn').onclick = () => {
        let confirmation = confirm('Do you wish to delete this operation from Olisc? This action cannot be undone.')
        if (confirmation)
            olisc.delete(id).then(() => {
                updateDisplayByIDs(['scheduledList'],['scheduledView'])
                handleOliscFilterSelection(document.getElementById('oliscStatusSelection'))
            }).catch((e) => {
                console.log(e.response)
                alert('Failed to delete operation, check the browser console for details.')
            })
    }
    updateDisplayByIDs(['scheduledView'],['scheduledList'])
}

function loadEditor() {
    if (jsonEditorLoaded) return
    loadRemoteCSS('lib/jsoneditor/ace/dracula.css')
    loadRemoteCSS('lib/jsoneditor/jsoneditor.css')
    loadRemoteCSS('lib/jsoneditor/jsoneditordarktheme.css')
    loadRemoteJavaScript('lib/jsoneditor/ace/ace.js')
    loadRemoteJavaScript('lib/jsoneditor/jsoneditor-minimalist.js')
    jsonEditorLoaded = true
}

function loadOliscDatePicker() {
    // Scheduled uploads date and time picker
    const oneYear = 31536000000
    const now = Math.ceil(new Date().getTime() / 300000) * 300000
    scheduleDatePicker = flatpickr('#scheduleposttime',{
        enableTime: true,
        dateFormat: 'F j, Y G:i K',
        minDate: new Date(now),
        maxDate: new Date(now+(100*oneYear)),
        minuteIncrement: 5,
        onChange: (selectedTime, dateStr, instance) => {
            let s = new Date(selectedTime[0]).getTime()
            if (!Number.isInteger(s/300000))
                scheduleDatePicker.setDate(Math.ceil(s / 300000) * 300000)
            document.getElementById('scheduledStr').innerText = 'Scheduled to publish at '+new Date(Math.ceil(s / 300000) * 300000).toLocaleString()
        }
    })

    document.getElementById('schedulepostswitch').onchange = () => {
        if (document.getElementById('schedulepostswitch').checked) {
            updateDisplayByIDs(['schedulepostdetails'],[])
            if (scheduleDatePicker.selectedDates.length > 0)
                document.getElementById('scheduledStr').innerText = 'Scheduled to publish at '+new Date(scheduleDatePicker.selectedDates[0]).toLocaleString()
            else
                document.getElementById('scheduledStr').innerText = 'Please select a date and time to schedule'
        } else {
            updateDisplayByIDs([],['schedulepostdetails'])
            document.getElementById('scheduledStr').innerText = 'Publishing immediately'
        }
    }
}

function validateDatePicker() {
    if (document.getElementById('schedulepostswitch').checked) {
        if (scheduleDatePicker.selectedDates.length === 0) {
            alert('Please select a date/time to schedule posting')
            return -1
        }
        return scheduleDatePicker.selectedDates[0].getTime()
    } else
        return 0
}