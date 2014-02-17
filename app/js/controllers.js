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

            /**
             * Reads the specified expressions data and converts them into an array of expression objects exposing methods fr incrementing.
             * @param expressionsData
             * @returns {Array}
             */
            function makeExpressions(expressionsData) {
                var result = [];
                var currentExpression;

                for (var i = 0; i < expressionsData.length; i++) {
                    currentExpression = expressionsData[i];
                    result[i] = newExpression(
                        currentExpression.text,
                        currentExpression.id,
                        currentExpression.count);
                }

                return result;
            };

            function find_expression_by_id(expr_id, expr_array) {
                var res;
                forEach(expr_array)(function (expr) {
                    if (expr.id === expr_id) {
                        res = expr;
                    }
                });
                return res;
            }

            /**
             * Factory function for creating new expressions.
             * The created expression exposes methods for obtaining the current count, and asking to increment it.
             * @param {String} exprText the text of the expression to create
             * @param myId
             * @param count
             */
            function newExpression(exprText, myId, count) {
                // hidden variable for the counter
                var myCounter = count;

                function incrementMe() {
                    myCounter += 1;
                };

                function getCount() {
                    return myCounter;
                };

                function askIncrement() {
                    sh_webSocket().send_message(
                        'ask-increment',
                        {
                            "expression_id": myId
                        }
                    );
                };

                return {
                    'id': myId,
                    'text': exprText,
                    'getCount': getCount,
                    'askIncrement': askIncrement,
                    'increment_me': incrementMe
                };

            }

            user_service.set_pseudo('val');

            $scope.pseudo = user_service.get_pseudo();

            shf_jsonp("/expressions").
                success(function (expressions_data) {
                    $scope.expressions = makeExpressions(expressions_data);
                });

            sh_webSocket().set_handler_for("connect", applying_callback_of(function (content) {
                $scope.message = content;
            }));
            sh_webSocket().set_handler_for("increment", applying_callback_of(function(content){
                var expr_id = content.expression_id;
                find_expression_by_id(expr_id,$scope.expressions).increment_me();
            }));

            var cpt = 0;
            $scope.ping = function () {
                sh_webSocket().send_message("ping", "Ping number " + cpt);
            }

        }]);
}());