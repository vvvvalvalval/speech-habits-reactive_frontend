'use strict';

/* Controllers */
(function () {
    var controllers = angular.module('speech-habits-front.controllers', [])

    controllers.controller('MainController', ['$scope', 'domain_URL', 'shf_jsonp', 'user_service', 'sh_webSocket',
        function ($scope, domain_URL, shf_jsonp, user_service, sh_webSocket) {

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

            user_service.set_pseudo('val');

            $scope.pseudo = user_service.get_pseudo();

            shf_jsonp("/expressions").
                success(function (expressions_data) {
                    $scope.expressions_data = expressions_data;
                });

            sh_webSocket().set_handler_for("connect", applying_callback_of(function (content) {
                $scope.message = content;
            }));

            var cpt = 0;
            $scope.ping = function () {
                sh_webSocket().send_message("ping", "Ping number " + cpt);
            }

        }]);
}());