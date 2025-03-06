// ----- FUNCTIONS ----- //
 
/** Repeats a provided function x number of times
 * https://stackoverflow.com/a/35556907/11039898
 * @param {Function} func 
 * @param {Number} times 
 */
export function repeat(func, times=1) {
    func();
    times && --times && repeat(func, times);
}


// ----- NUMBERS ----- //

/** Uses the modulus operator to keep a value within amount */
export function clamp(value, max) {
    return ((value % max) + max) % max;
}


// ----- ARRAYS ----- //

/** Shuffles are array by modifying it, then returns original array (now shuffled)
 * https://stackoverflow.com/a/2450976/11039898
*/
export function shuffle(array) {
    let currentIndex = array.length;
 
    // While there remain elements to shuffle...
    while(currentIndex !== 0) {
        // Pick a remaining element...
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
 
        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
 
    return array;
}

/** Modifies the provided array by rotating all of its items
 * @param {Array} arr Array to rotate once
 * @param {Number} dir Direction to rotate in (accepts either 1 or -1, any other input will result in an unchanged array)
 * @returns {Array} The original array, now modified
 */
export function rotateArr(arr, dir=1) {
	if(dir === 1) arr.unshift(arr.pop());
	else if(dir === -1) arr.push(arr.shift());
    return arr;
}

/** Takes an array and returns a random entry from it
 * @param {Array} arr 
 * @returns {*}
 */
export function arrRandom(arr) {
    return arr[Math.floor(Math.random()*arr.length)]
}


// ----- STRINGS ----- //

/** Capitalizes the first letter of a string
 * @param {String} string 
 * @returns {String}
 */
export function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
