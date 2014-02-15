'use strict';

/* Services */

(function(){
    var services = angular.module('speech-habits-front.services', []);

    /**
     * That service holds the domain URL of the backend.
     */
    services.value('domain_URL', 'http://localhost:9000');

    /**
     * This service is a shorthand for sending JSONP requests to the backend of the Speech-Habits application.
     * You use it just like you would $http.get, but with a relative URL
     */
    services.factory('shf_jsonp', ['$http','domain_URL',function($http,domain_URL){
        return function(relative_URL){
            return $http.jsonp(domain_URL + relative_URL + "?callback=JSON_CALLBACK");
        };
    }]);

    services.factory('incrementor',[function(){
        var cpt = 0;

        return function(){
            var result = cpt;
            cpt += 1;
            return result;
        }
    }]);
}());
