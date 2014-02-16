/**
 * Created by val on 14/02/14.
 */
/**
 * Functional (currified) construct for iterating over the property names of an object.
 * @param obj the object which properties are t be iterated over.
 * @param accept_functions whether the functional members should be accepted or filtered.
 * @param accept_inherited_members whether the members inherited from the prototype chain should be accepted or filtered.
 * @returns {Function} A function that accepts a 'body' as its argument, i.e a function with a single argument that is the name of the current property. That body function gets executed for each
 */
function forOwnProperty(obj, accept_functions, accept_inherited_members) {
    return function (body_function) {
        for (name in obj) {
            if (obj.hasOwnProperty(name) || accept_inherited_members) {
                if ((typeof obj[name] !== 'function') || accept_functions) {
                    body_function(name);
                }
            }
        }
    };
}

/**
 * A for-like constructs that iterates over the items of an array (or any array-like structure).
 * @param array the array which elements are to be iterated over.
 * @returns {Function} A function consuming a body function which takes an 'item' parameter, and optionally an 'index' parameter.
 */
function forEach(array) {
    return function (body_function) {
        var idx, item;
        for (idx = 0; idx < array.length; idx++) {
            item = array[idx];
            body_function(item, idx);
        }
    }
}