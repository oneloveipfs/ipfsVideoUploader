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
        return (await axios[verb]('/olisc'+method+geturl,json)).data
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
    let result = ''
    oliscLoaded = {}
    for (let i in list) {
        result += '<tr><td>'+list[i]._id+'</td><td>'+list[i].operationNetwork+'</td><td>'
        if (list[i].operationNetwork === 'avalon')
            result += 'Type '+list[i].operation.type
        else
            result += joinGrapheneOps(list[i].operation)
        result += '</td><td><a onclick="viewOliscOp(\''+list[i]._id+'\')">View</a></td>'
        oliscLoaded[list[i]._id] = list[i]
    }
    document.getElementById('oliscTbody').innerHTML = result
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
    updateDisplayByIDs(['scheduledView'],['scheduledList'])
}

function loadEditor() {
    if (jsonEditorLoaded) return
    let draculaCss = document.createElement('link')
    draculaCss.setAttribute('rel','stylesheet')
    draculaCss.setAttribute('type','text/css')
    draculaCss.setAttribute('href','lib/jsoneditor/ace/dracula.css')

    let jsonEditorCss = document.createElement('link')
    jsonEditorCss.setAttribute('rel','stylesheet')
    jsonEditorCss.setAttribute('type','text/css')
    jsonEditorCss.setAttribute('href','lib/jsoneditor/jsoneditor.css')

    let jsonEditorDarkCss = document.createElement('link')
    jsonEditorDarkCss.setAttribute('rel','stylesheet')
    jsonEditorDarkCss.setAttribute('type','text/css')
    jsonEditorDarkCss.setAttribute('href','lib/jsoneditor/jsoneditordarktheme.css')

    let aceJs = document.createElement('script')
    aceJs.setAttribute('type','text/javascript')
    aceJs.setAttribute('src','lib/jsoneditor/ace/ace.js')

    let jsonEditorJs = document.createElement('script')
    jsonEditorJs.setAttribute('type','text/javascript')
    jsonEditorJs.setAttribute('src','lib/jsoneditor/jsoneditor-minimalist.js')

    let head = document.getElementsByTagName('head')[0]
    head.appendChild(draculaCss)
    head.appendChild(jsonEditorCss)
    head.appendChild(jsonEditorDarkCss)
    head.appendChild(aceJs)
    head.appendChild(jsonEditorJs)
    jsonEditorLoaded = true
}