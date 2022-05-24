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
    let list = await olisc.list({status})
    let result = ''
    for (let i in list) {
        result += '<tr><td>'+list[i]._id+'</td><td>'+list[i].operationNetwork+'</td><td>'
        if (list[i].operationNetwork === 'avalon')
            result += 'Type '+list[i].operation.type
        else
            result += joinGrapheneOps(list[i].operation)
        result += '</td><td>View</td>'
    }
    document.getElementById('oliscTbody').innerHTML = result
}

function joinGrapheneOps(operations) {
    let opNames = []
    for (let op in operations)
        opNames.push(operations[op][0])
    return opNames.join(', ')
}