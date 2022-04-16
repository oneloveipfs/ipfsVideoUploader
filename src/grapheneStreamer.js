const axios = require('axios')

module.exports = class {
    constructor(api,irreversible,network = '',startBlock = 0) {
        this.headBlock = startBlock
        this.parsedBlock = startBlock
        this.parsedBlockVops = startBlock
        this.fetchingBlock = false
        this.api = api
        this.irreversible = irreversible ? true : false
        this.network = network
        this.stopped = false
    }

    streamBlocks (cb) {
        // Stream chain props
        this.fetchProps()
        this.propsInterval = setInterval(() => this.fetchProps(),15000)
    
        // Stream blocks
        this.fetchBlocks(cb)
    }

    fetchProps() {
        axios.post(this.api,{
            id: 1,
            jsonrpc: '2.0',
            method: 'condenser_api.get_dynamic_global_properties',
            params: []
        }).then((props) => {
            let num = this.irreversible ? props.data.result.last_irreversible_block_num : props.data.result.head_block_number
            if (num > this.headBlock && this.headBlock === 0) {
                this.parsedBlock = num
                this.parsedBlockVops = num
            }
            this.headBlock = num
        }).catch((e) => console.log(this.network,'get_dynamic_global_properties error',e))
    }

    fetchBlocks(cb) {
        if (this.stopped) return
        if (this.headBlock === 0 || this.headBlock === this.parsedBlock) {
            // console.log('skipping round',this.headBlock,this.parsedBlock)
            return setTimeout(() => this.fetchBlocks(cb),3000)
        }
        
        if (this.network === 'hive') {
            axios.post(this.api,{
                id: 1,
                jsonrpc: '2.0',
                method: 'block_api.get_block_range',
                params: {
                    starting_block_num: this.parsedBlock+1,
                    count: Math.min(this.headBlock-this.parsedBlock,100)
                }
            }).then((newBlocks) => {
                if (newBlocks.data.result && newBlocks.data.result.blocks && newBlocks.data.result.blocks.length > 0) {
                    this.parsedBlock += newBlocks.data.result.blocks.length
                    // console.log('parsed',newBlocks.data.result.blocks.length,'headBlock',this.headBlock,'parsedBlock',this.parsedBlock)
                    for (let b in newBlocks.data.result.blocks) {
                        for (let t in newBlocks.data.result.blocks[b].transactions)
                            newBlocks.data.result.blocks[b].transactions[t].transaction_id = newBlocks.data.result.blocks[b].transaction_ids[t]
                        cb(newBlocks.data.result.blocks[b])
                    }
                    setTimeout(() => this.fetchBlocks(cb),9000)
                }
            }).catch((e) => {
                console.log(this.network,'get_block_range error',e)
                setTimeout(() => this.fetchBlocks(cb),3000)
            })
        } else {
            axios.post(this.api,{
                id: 1,
                jsonrpc: '2.0',
                method: 'condenser_api.get_block',
                params: [this.parsedBlock+1]
            }).then((newBlock) => {
                if (newBlock.data.result) {
                    this.parsedBlock++
                    // console.log('headBlock',this.headBlock,'parsedBlock',this.parsedBlock)
                    cb(newBlock.data.result)
                    setTimeout(() => this.fetchBlocks(cb),this.headBlock === this.parsedBlock ? 3000 : 250)
                }
            }).catch((e) => {
                console.log(this.network,'get_block error',e)
                setTimeout(() => this.fetchBlocks(cb),3000)
            })
        }
    }

    fetchVops(filter,cb) {
        if (this.stopped) return
        if (this.network !== 'hive')
            return
        
        if (this.headBlock === 0 || this.headBlock === this.parsedBlockVops)
            return setTimeout(() => this.fetchVops(filter,cb),3000)

        if (typeof filter !== 'number')
            filter = null

        let end = this.headBlock+1

        axios.post(this.api,{
            id: 1,
            jsonrpc: '2.0',
            method: 'account_history_api.enum_virtual_ops',
            params: {
                block_range_begin: this.parsedBlockVops+1,
                block_range_end: end,
                filter: filter
            }
        }).then((newVops) => {
            if (newVops.data.result && newVops.data.result.ops) {
                this.parsedBlockVops = end-1
                // console.log('parsed vops',newVops.data.result.ops.length,'headBlock',this.headBlock,'parsedBlockVops',this.parsedBlockVops)
                for (let vop in newVops.data.result.ops)
                    cb(newVops.data.result.ops[vop])
            }
            setTimeout(() => this.fetchVops(filter,cb),9000)
        }).catch((e) => {
            console.log(this.network,'enum_virtual_ops error',e)
            setTimeout(() => this.fetchVops(filter,cb),3000)
        })
    }

    streamTransactions(cb,vopfilter,vopcb) {
        this.streamBlocks((newBlock) => {
            newBlock.transactions.forEach(txn => cb(txn))
        })

        if (this.network === 'hive' && typeof vopcb === 'function')
            this.fetchVops(vopfilter,vopcb)
    }

    stop(cb) {
        this.stopped = true
        clearInterval(this.propsInterval)
        if (typeof cb === 'function')
            setTimeout(cb,10000)
    }
}