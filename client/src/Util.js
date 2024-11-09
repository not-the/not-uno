/** Imports an external file and parses if JSON */
export function get(url, parse=true) {
    var rq = new XMLHttpRequest();
    rq.open("GET", url, false);
    rq.send(null);
    return parse ? JSON.parse(rq.responseText) : rq.responseText;
}

/** Shuffles are array by modifying it, then returns original array (now shuffled)
 * https://stackoverflow.com/a/2450976/11039898
 * @param {Array} array
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

/** Repeat function
 * https://stackoverflow.com/a/35556907/11039898
 * @param {Function} func 
 * @param {Number} times 
 */
export function repeat(func, times=1) {
    func();
    times && --times && repeat(func, times);
}

/** Uses modulus operator to keep value within amount
 * @param {Number} value 
 * @param {Number} max Maximum value before looping back to 0
 * @returns {Number}
 */
export function clamp(value, max) {
    return ((value % max) + max) % max;
}

/** Stores objects using localStorage
 * @param {String} key localStorage key. If no value is specified, localStorage will check for an entry with this key and return the data
 * @param {Object} value Data to store (optional)
 * @returns {Object}
 */
export function store(key, value) { return value ? localStorage.setItem(key, JSON.stringify(value)) : JSON.parse(localStorage.getItem(key)); }

/** Returns a random element from an array
 * @param {Array} arr Array to pull from
 * @returns Random element from the array
 */
export function arrRandom(arr) {
    return arr[Math.floor(Math.random()*arr.length)]
}

/** Capitalize the first letter in a string
 * @param {String} string String to capitalize
 * @returns String with its first letter set to uppercase
 */
export function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}