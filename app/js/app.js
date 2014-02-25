'use strict';

(function () {
// Declare app level module which depends on filters, and services
    var sh_app = angular.module('speech-habits-front', [
        'ngRoute',
        'speech-habits-front.controllers',
        'speech-habits-front.services'
    ]);

    sh_app.config(['$routeProvider', function ($routeProvider) {
        /*
         * This part declares the routing configuration that will enable us to have multiple views
         */
        $routeProvider.when('/room', {
            templateUrl: 'partials/room.html',
            controller: 'RoomController'
        }).when('/login', {
                templateUrl: "partials/welcome-page.html",
                controller: 'WelcomePageController'
            }).otherwise({
                redirectTo: '/login'
            });
    }]);
}());