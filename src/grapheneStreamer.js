const axios = require('axios')

module.exports = class {
    constructor(api,irreversible) {
        this.headBlock = 0
        this.unparsedBlocks = 0
        this.fetchingBlock = false
        this.api = api
        this.irreversible = irreversible ? true : false
    }

    streamBlocks (cb) {
        // Stream blocks
        setInterval(() => {
            axios.post(this.api,{
                id: 1,
                jsonrpc: '2.0',
                method: 'condenser_api.get_dynamic_global_properties',
                params: []
            }).then((props) => {
                let num = this.irreversible ? props.data.result.last_irreversible_block_num : props.data.result.head_block_number
                if (num > this.headBlock)
                    if (this.headBlock == 0) 
                        this.headBlock = num
                    else
                        this.unparsedBlocks = num - this.headBlock
            })
        },3000)
    
        setInterval(() => {
            if (this.unparsedBlocks > 0 && !this.fetchingBlock) {
                this.fetchingBlock = true
                axios.post(this.api,{
                    id: 1,
                    jsonrpc: '2.0',
                    method: 'condenser_api.get_block',
                    params: [this.headBlock]
                }).then((newBlock) => {
                    this.headBlock++
                    this.unparsedBlocks--
                    setTimeout(() => this.fetchingBlock = false,500)
                    cb(newBlock.data.result)
                }).catch(() => this.fetchingBlock = false)
            }
        },1000)
    }

    streamTransactions(cb) {
        this.streamBlocks((newBlock) => {
            newBlock.transactions.forEach(txn => cb(txn))
        })
    }
}