'use strict';

/* Controllers */
(function () {
    var controllers = angular.module('speech-habits-front.controllers', []);

    /**
     * Creates a Controller injectable-body which logs the lifecycle of the Controller.
     * @param controller_name the name of the Controller-to-be.
     * @param injectable_body the body of the Controller.
     * @returns {*} the new body.
     */
    function lifecycle_monitored_controller_body(controller_name, injectable_body) {

        return merge_injectable_bodies([
            ['$log', function ($log) {
                $log.debug("Initializing Speech-Habits controller : " + controller_name + "...");
            }],
            injectable_body,
            ['$log', function ($log) {
                $log.debug("Done initializing-Speech Habits controller : " + controller_name + ".");
            }]
        ]);

    }

    /**
     * Creates a Controller injectable-body which redirects to login page if no user is currently logged in.
     * @param controller_name the name of the Controller-to-be.
     * @param injectable_body the body of the Controller.
     * @returns {*} the new body.
     */
    function login_checked_controller_body(controller_name, injectable_body) {

        return merge_injectable_bodies(
            [
                ['user_service', '$location', '$log', function (user_service, $location, $log) {
                    if (!user_service.is_logged_in()) {
                        $log.warn("No user is currently logged in : refusing access to " + controller_name + ", and redirectign to login page.");
                        $location.path('/login');
                    }
                }],
                injectable_body
            ]
        );
    }

    function make_sh_controller(controller_name, injectable_body) {
        controllers.controller(controller_name,
            login_checked_controller_body(controller_name,
                lifecycle_monitored_controller_body(controller_name,
                    injectable_body
                )
            )
        );
    }

    /**
     * To make a callback/function applied in scope.
     * @param $scope the current scope of the Controller.
     * @returns {Function}A function consuming a function and returning the same function, with the additional effect of being applied in scope.
     */
    function applying_in_scope($scope) {
        return augmented_with(function (invoke) {
            $scope.$apply(invoke);
        });
    }

    controllers.controller('WelcomePageController', lifecycle_monitored_controller_body('WelcomePageController',
        ['$scope', '$location', 'user_service', '$log',
            function ($scope, $location, user_service, $log) {
                $scope.pseudo = user_service.get_pseudo();
                $scope.login = function () {
                    $log.debug('Requesting login as ' + $scope.pseudo);

                    if ($scope.pseudo) {
                        user_service.set_pseudo($scope.pseudo);
                        $location.path("/teachers_list");
                    }
                };
            }]));

    make_sh_controller('TeachersListController', ['sh_webSocket', '$scope', '$location', 'user_service', '$log',
        function (sh_webSocket, $scope, $location, user_service, $log) {

            var teachers_list = [];
            $scope.teachers_list = function () {
                return teachers_list;
            };

            var refreshing = applying_in_scope($scope);

            $log.info("Requesting the list of teachers.")
            sh_webSocket().send_message("request_teachers_list", {});
            sh_webSocket().set_handler_for("list_of_teachers", refreshing(function (content) {
                $log.info("Received the list of teachers.")
                teachers_list = content.teachers;
            }));

            function drop_handlers() {
                sh_webSocket().remove_handler_for("list_of_teachers");
            }

            $scope.pseudo = user_service.get_pseudo();

            $scope.go_to_teacher_room = function (teacher_id) {
                $log.debug("Requested to move to teacher room : " + teacher_id);
                drop_handlers();
                $location.path("/room/" + teacher_id)
            }
        }]);

    make_sh_controller('RoomController', ['$scope', '$routeParams', 'domain_URL', 'shf_jsonp', 'user_service', 'sh_webSocket', '$location', '$log',
        function ($scope, $routeParams, domain_URL, shf_jsonp, user_service, sh_webSocket, $location, $log) {

            var teacher_id = +$routeParams.teacher_id;
            $log.debug("Creating room controller for : " + teacher_id);

            var refreshing = applying_in_scope($scope);

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
                    $log.info("Incrementing expression : " + exprText);
                    myCounter += 1;
                };

                function getCount() {
                    return myCounter;
                };

                function askIncrement() {
                    $log.debug("Asking to increment expression : " + exprText);
                    sh_webSocket().send_message(
                        'ask_increment',
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

            if (user_service.is_logged_in()) {

                $scope.pseudo = user_service.get_pseudo();

                sh_webSocket().send_message("join_room", {
                    "teacher_id": teacher_id
                });
                sh_webSocket().set_handler_for("increment", refreshing(function (content) {
                    var expr_id = content.expression_id;
                    find_expression_by_id(expr_id, $scope.expressions).increment_me();
                }));
                sh_webSocket().set_handler_for("state_update", refreshing(function (content) {
                    $log.debug("Received state update.");

                    var expressions_data = content.expressions;
                    $scope.expressions = makeExpressions(expressions_data);
                    $scope.score = content.score;
                }));
                sh_webSocket().set_handler_for("score_update", refreshing(function (content) {
                    var old_score = content.old_score;
                    var new_score = content.new_score;

                    $log.debug("Received score update : " + old_score + " -> " + new_score);

                    $scope.score = new_score;
                }));

                $scope.leave_room = function () {
                    $log.info("Leaving the room of : " + teacher_id);

                    //removing the handlers
                    var ws = sh_webSocket();
                    ws.remove_handler_for("increment");
                    ws.remove_handler_for("state_update");
                    ws.remove_handler_for("score_update");

                    //sending a leave-room message
                    ws.send_message("leave_room", {
                        "teacher_id": teacher_id
                    });

                    $location.path('/teachers_list');
                }
            }
        }]);
}());