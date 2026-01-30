/** Log entry object */
export default class LogEntry {
    constructor(id, params, index) {
        // Timestamp
        this.timestamp = Date.now();

        // Data
        this.id = id;
        this.params = params;
        this.index = index;
    }

    /** Logging disabled */
    static amend() { }

    /** Amend log entry */
    amend(success, msg) {
        this.success = success;
        this.amendment = msg;

        // Method chaining
        return this;
    }
}