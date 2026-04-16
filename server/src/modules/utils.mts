// ----- FUNCTIONS ----- //
 
/** Repeats a provided function x number of times
 * https://stackoverflow.com/a/35556907/11039898
 */
export function repeat(func: () => any, times: number=1) {
    func()
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    times && --times && repeat(func, times)
}


// ----- NUMBERS ----- //

/** Uses the modulus operator to keep a value within amount */
export function clamp(value: number, max: number) {
    return ((value % max) + max) % max
}


// ----- ARRAYS ----- //

/** Shuffles are array by modifying it, then returns original array (now shuffled)
 * https://stackoverflow.com/a/2450976/11039898
*/
export function shuffle(array: any[]) {
    let currentIndex = array.length
 
    // While there remain elements to shuffle...
    while(currentIndex !== 0) {
        // Pick a remaining element...
        const randomIndex = Math.floor(Math.random() * currentIndex)
        currentIndex--;
 
        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]]
    }
 
    return array
}

/** Modifies the provided array by rotating all of its items
 * @param {Array} arr Array to rotate once
 * @param {Number} dir Direction to rotate in (accepts either 1 or -1, any other input will result in an unchanged array)
 * @returns {Array} The original array, now modified
 */
export function rotateArr(arr: any[], dir: number=1) {
    if(dir === 1) arr.unshift(arr.pop())
    else if(dir === -1) arr.push(arr.shift())
    return arr
}

/** Takes an array and returns a random entry from it */
export function arrRandom(arr: any[]): any {
    return arr[Math.floor(Math.random()*arr.length)]
}


// ----- STRINGS ----- //

/** Capitalizes the first letter of a string */
export function capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1)
}

/** Create a formatted date from Date object. Defaults to current time.
 * @returns {string} Provided date in a readable format
 */
export function formattedDate(
    date: Date = new Date() /** (Optional) new Date object. Uses the current date is undefined. */
) {
    let hours = date.getHours()
    let minutes: string | number = date.getMinutes()
    let seconds: string | number = date.getSeconds()

    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    hours = hours ? hours : 12
    minutes = minutes < 10 ? '0' + minutes : minutes
    seconds = seconds < 10 ? '0' + seconds : seconds

    const monthYear = date.toISOString().split('T')[0]

    // Combine time and date
    return `${hours}:${minutes}:${seconds} ${ampm}, ${monthYear}`
}
