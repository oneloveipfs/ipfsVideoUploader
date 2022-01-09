class ProcessingQueue {
    constructor() {
        this.queue = []
        this.processing = false
    }

    push(f = { id: '', f: (cb) => cb()}) {
        this.queue.push(f)
        if (!this.processing) {
            this.processing = this.queue[0].id
            this.execute()
        }
    }

    execute() {
        let first = this.queue.shift()
        first.f(() => {
            if (this.queue.length > 0) {
                this.processing = this.queue[0].id
                this.execute()
            } else
                this.processing = false
        })
    }
}

module.exports = ProcessingQueue