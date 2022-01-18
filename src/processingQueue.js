class ProcessingQueue {
    constructor() {
        this.queue = []
        this.processing = ''
        this.s = {}
    }

    push(f = { id: '', f: (cb) => cb(), s: {}}) {
        this.queue.push(f)
        if (!this.processing) {
            this.processing = this.queue[0].id
            this.execute()
        }
    }

    execute() {
        let first = this.queue.shift()
        this.s = first.s
        first.f(first.s, () => {
            if (this.queue.length > 0) {
                this.processing = this.queue[0].id
                this.execute()
            } else {
                this.processing = ''
                this.s = {}
            }
        })
    }
}

module.exports = ProcessingQueue