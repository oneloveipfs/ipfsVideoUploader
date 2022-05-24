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