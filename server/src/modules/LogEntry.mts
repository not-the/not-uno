/** Log entry object */
export default class LogEntry {
    timestamp: number
    id: string
    params: any[]
    index: number
    success: boolean | null
    amendment?: string

    constructor(
        id: string,
        params: any[],
        index: number
    ) {
        // Timestamp
        this.timestamp = Date.now()

        // Data
        this.id = id
        this.params = params
        this.index = index

        // Result
        this.success = null
        this.amendment = undefined
    }

    /** Logging disabled */
    static amend() { }

    /** Amend log entry */
    amend(success: boolean, msg: string) {
        this.success = success
        this.amendment = msg

        // Method chaining
        return this
    }
}
