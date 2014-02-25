/**
 * Created by val on 14/02/14.
 */

/**
 * Utility function that merges several injectable bodies into one injectable body that sequentially executes them.
 *
 * We call 'injectable body' an array such as those used to create AngularJS services or controllers : an array that begins with services names, and which last element is a 'body' function into which the corresponding services are injected and that gets executed.
 *
 * @param injectable_bodies an array of injectable bodies, i.e an array of arrays, for which all elements are strings except for the last one that is a function.
 * @returns {Array} the injectable body that is obtained by merging all these injectable bodies : the services names list is the concatenation of all the services names list, and the body function executes all body function sequentially.
 */
var merge_injectable_bodies = (function () {
    /**
     * a utility function for extracting sub-arrays
     * @param arr the array to extract from
     * @param start the first index (inclusive)
     * @param end the last index (exclusive)
     * @returns {Array}
     */
    function sub_array(arr, start, end) {
        var result = [];
        for (var i = start; i < end; i++) {
            result.push(arr[i]);
        }
        return result;
    }

    /**
     * utility function for extracting all elements from an array but the last one.
     * @param arr
     * @returns {Array}
     */
    function all_but_last(arr) {
        return sub_array(arr, 0, arr.length - 1);
    }

    //the function itself.
    return function (injectable_bodies) {
        var bodiesData = [];

        //executing that function creates an object for each injectable body with useful info.
        function extractBodiesData() {
            var currentArgs = [];
            var beginIndex = 0;
            var endIndex;
            for (var i = 0; i < injectable_bodies.length; i++) {
                //an array with names and a function
                currentArgs = injectable_bodies[i];
                endIndex = beginIndex + currentArgs.length - 1;

                bodiesData.push({
                    "servicesNames": all_but_last(currentArgs),
                    "beginIndex": beginIndex,
                    "endIndex": endIndex,
                    "bodyFunction": currentArgs[currentArgs.length - 1]
                });

                beginIndex = endIndex;
            }
        }

        var mergedBody = [];

        extractBodiesData();

        //adding all the services names.
        for (var i = 0; i < injectable_bodies.length; i++) {
            var servicesNames = bodiesData[i].servicesNames;
            for (var j = 0; j < servicesNames.length; j++) {
                mergedBody.push(servicesNames[j]);
            }
        }

        //the function that is passed as the last argument of mergedArgs. Is injected with all the merged services.
        var wrappingFunction = function () {
            var currentBodyData, currentBody, currentInjectedServices;
            //for each args array, we retrieve the injected services and feed them to the corresponding body function.
            for (var i = 0; i < bodiesData.length; i++) {
                //retrieving the data for the current body.
                currentBodyData = bodiesData[i];
                currentBody = currentBodyData.bodyFunction;

                //building an argument array that are the services to inject into the current body function.
                currentInjectedServices = sub_array(arguments, currentBodyData.beginIndex, currentBodyData.endIndex);

                //calling the body function with the injected services.
                currentBody.apply(null, currentInjectedServices);
            }
        }
        //appending the wrapping function that merges all the body function at the end of the merged arguments array.
        mergedBody.push(wrappingFunction);

        return mergedBody;
    };
}());

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

/**
 * Curryfied construct for wrapping a function so as to return a particular value.
 * @param returned_value the value to be returned
 * @returns {Function} A function that consumes the body function (which should return no value) to be wrapped.
 */
function returning(returned_value){
    return function(body_function){
        return function(){
            var args = arguments;
            body_function.apply(null, args);
            return returned_value;
        };
    }
}