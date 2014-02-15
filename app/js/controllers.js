'use strict';

/* Controllers */
(function () {
    var controllers = angular.module('speech-habits-front.controllers', [])

    function newWebSocketEventManager() {
        var manager;
        var handlers = {};

        function registerHandler(eventTypeName, handlerFunction) {
            if (!handlers[eventTypeName]) {
                handlers[eventTypeName] = [];
            }
            var handlersForEventType = handlers[eventTypeName];
            handlersForEventType.push(handlerFunction);

            //to allow cascading
            return manager;
        }

        var globalHandler = function (message) {
            var messageData = JSON.parse(message.data);
            var eventTypeName = messageData["event-type"];
            var data = messageData["data"];
            var handlersForType = handlers[eventTypeName];

            //nothing happens if no handler registered for this type of event.
            if (handlersForType) {
                for (var i = 0; i < handlersForType.length; i += 1) {
                    //applying each handler function
                    handlersForType[i](data);
                }
            }


        };

        manager = {
            "registerHandler": registerHandler,
            "globalHandler": globalHandler
        }

        return manager;
    }


    controllers.controller('MainController', ['$scope', '$http', 'domain_URL', 'shf_jsonp',
        function ($scope, $http, domain_URL, shf_jsonp) {

            /**
             * Transforms a callback function into a callback function which applies to the current scope.
             * @param callback a callback function taking any number of arguments
             * @returns {Function}
             */
            function applying_callback_of(callback) {

                return function () {
                    var args = arguments;
                    $scope.$apply(function () {
                        callback.apply(null, args);
                    });
                };
            }

            $scope.pseudo = "val";

            shf_jsonp("/expressions").success(function (expressions_data) {
                $scope.expressions_data = expressions_data;
            });

            var manager = newWebSocketEventManager();
            manager.registerHandler("connect", applying_callback_of(function (data) {
                $scope.message = data;
            }));
            var ws = new WebSocket("ws://localhost:9000/studentSocket/" + $scope.pseudo)
            ws.onmessage = manager.globalHandler

        }]);

    controllers.controller('sandbox_ctrl',['$scope','incrementor',function($scope,incrementor){

        $scope.service_cpt1 = incrementor();

        var service_cpt2 = incrementor();
        $scope.service_cpt2 = service_cpt2;

        $scope.get_service_cpt3 = function(){
            return incrementor();
        };

        var cpt1 = 0;
        $scope.get_cpt1 = function(){
            return cpt1;
        };
        $scope.incr_cpt1 = function(){
            cpt1 += 1;
        };

        $scope.cpt2 = 0;
        $scope.incr_cpt2 = function(){
            $scope.cpt2 += 1;
        };

        $scope.no_effect = function(){

        };
    }]);

    controllers.controller('codependent',['$scope',function($scope){
        var cpt1 = 0;
        var cpt2 = 0;

        $scope.get1 = function(){
            cpt2 += 1;
            return cpt1;
        };

        $scope.get2 = function(){
            cpt1 += 1;
            return cpt2;
        };

    }]);
}());