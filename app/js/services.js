'use strict';

/* Services */

(function () {
    var services = angular.module('speech-habits-front.services', []);

    /**
     * That service holds the domain URL of the backend.
     */
    services.value('domain_URL', 'ancient-taiga-8188.herokuapp.com');

    /**
     * This service is a shorthand for sending JSONP requests to the backend of the Speech-Habits application.
     * You use it just like you would $http.get, but with a relative URL
     */
    services.factory('shf_jsonp', ['$http', 'domain_URL', '$log', function ($http, domain_URL, $log) {
        return function (relative_URL) {
            var full_URL = "http://" + domain_URL + relative_URL;

            $log.debug("Sending JSONP request to : " + full_URL);

            return $http.jsonp(full_URL, {
                "params": {
                    "callback": "JSON_CALLBACK"
                }
            });
        };
    }]);

    /**
     * This service holds the pseudo of the user, exposing methods to access and change it, and knowing if any user is logged in.
     */
    services.factory('user_service', ['$log', function ($log) {

        var pseudo;

        function get_pseudo() {
            return pseudo;
        }

        function set_pseudo(new_pseudo) {
            $log.info("Changed user pseudo from " + pseudo + " to " + new_pseudo);
            pseudo = new_pseudo;
        }

        function is_logged_in() {
            if (pseudo) {
                return true;
            } else {
                return false;
            }
        }

        return {
            "get_pseudo": get_pseudo,
            "set_pseudo": set_pseudo,
            "is_logged_in": is_logged_in
        };
    }]);

    services.factory('sh_webSocket', ['user_service', 'domain_URL', '$timeout', '$log',
        function (user_service, domain_URL, $timeout, $log) {

            /**
             * The number of milliseconds to wait before trying to reconnect the WebSocket if it was closed unpurposedly. This reasonable delay avoids to get stuck in a resource-consuming fast loop that could crash the application.
             * @type {number} the number of milliseconds that define the delay
             */
            var webSocket_reconnect_delay = 1000;

            var sh_webSocket;

            /**
             * Factory function for a
             * @param pseudo
             * @returns {{send_message: send_message, set_handler_for: set_handler_for, remove_handler_for: remove_handler_for, clear_handlers: clear_handlers, finish_and_close: *}}
             */
            function new_sh_webSocket(pseudo) {

                //the Actual webSocket object.
                var webSocket;

                /**
                 * Whether the webSocket is currently open.
                 * @returns {boolean}
                 */
                function is_open() {
                    if (webSocket) {
                        if (webSocket.readyState === WebSocket.OPEN) {
                            return true;
                        } else {
                            return false;
                        }
                    } else {
                        return false;
                    }
                }

                /**
                 * This object holds properties which names are the message type names and which values are handler functions for JSON message content.
                 * @type {{Object}}
                 */
                var handlers = {};

                /**
                 * The queue of messages that are waiting to be sent.
                 * @type {Array}
                 */
                var messages_to_be_sent = [];

                /**
                 * Whether we currently mean the webSocket to be open or closed.
                 * @type {boolean}
                 */
                var should_be_open = true;

                function do_send(json_message) {
                    var stringified = JSON.stringify(json_message);
                    webSocket.send(stringified);

                    $log.debug("Just sent message through webSocket : " + stringified);
                }

                /**
                 * Sends the specified message into the WebSocket.
                 * @param sh_message_type the type name of the message.
                 * @param message_content the content of the message as a JSON object.
                 */
                function send_message(sh_message_type, message_content) {
                    var json_message = {
                        "message_type": sh_message_type,
                        "content": message_content
                    };
                    if (is_open()) {
                        do_send(json_message);
                    } else {
                        messages_to_be_sent.push(json_message);
                    }
                }

                function clear_messages_to_be_sent() {
                    messages_to_be_sent = [];
                }

                function send_all_remaining() {
                    $log.debug("Sending " + messages_to_be_sent.length + " pending messages through webSocket");

                    forEach(messages_to_be_sent)(function (message) {
                        do_send(message);
                    });
                    clear_messages_to_be_sent();
                }

                /**
                 * Sends all remaining messages if there are any, then closes the WebSocket.
                 */
                function finish_sending_and_close() {

                    $log.debug("Finish sending and closing webSocket for " + pseudo + "...");

                    //do nothing on future incoming messages
                    webSocket.onmessage = function () {
                    };

                    function send_all_and_close() {
                        send_all_remaining();
                        close();

                        $log.debug("Closed webSocket of " + pseudo + ".");
                    }

                    if (webSocket.readyState === WebSocket.CONNECTING) {
                        webSocket.onopen = send_all_and_close();
                    } else {
                        //We don't have to wait
                        send_all_and_close();
                    }


                }

                function message_handler(message) {
                    //we apply to notify changes.
                    $log.debug("Message " + message.data + " just came from webSocket for " + pseudo);

                    var message_data = JSON.parse(message.data);
                    var sh_message_type = message_data["message_type"];
                    var handler_for_type = handlers[sh_message_type];

                    if (handler_for_type) {

                        $log.debug("Handling message of type : " + sh_message_type);

                        var sh_message_content = message_data["content"];
                        handler_for_type(sh_message_content);
                    } else {
                        $log.warn("No handler was found for received message of type : " + sh_message_type);
                    }

                }

                function connect() {

                    $log.info("Connecting webSocket for " + pseudo + "...");

                    should_be_open = true;
                    webSocket = new WebSocket("ws://" + domain_URL + "/studentSocket/" + pseudo);
                    webSocket.onopen = function () {
                        $log.info("WebSocket for " + pseudo + " was successfully opened.");

                        //sending the awaiting messages and clearing the awaiting messages list.
                        send_all_remaining();
                    }
                    webSocket.onmessage = message_handler;
                    webSocket.onclose = function () {
                        if (should_be_open) {
                            //it should not have closed; re-connect.
                            $log.debug("WebSocket for " + pseudo + " was unpurposedly closed. Reconnecting...");

                            $timeout(connect, webSocket_reconnect_delay);
                        } else {
                            //alright, let it close.
                            $log.debug("WebSocket for " + pseudo + " was closed, as should be.");
                        }
                    }
                }

                function close() {
                    should_be_open = false;
                    if (webSocket) {
                        webSocket.close();
                    }
                }

                function set_handler_for(message_type, handler) {
                    handlers[message_type] = handler;
                }

                function remove_handler_for(message_type) {
                    delete handlers[message_type];
                }

                function clear_handlers() {
                    handlers = {};
                }

                //We connect before returning
                connect();

                var res = {
                    "get_pseudo": function () {
                        return pseudo;
                    },
                    "send_message": send_message,
                    "set_handler_for": returning(res)(set_handler_for),
                    "remove_handler_for": remove_handler_for,
                    "clear_handlers": clear_handlers,
                    "finish_and_close": finish_sending_and_close
                };

                return res;
            }

            /**
             * This function checks if the pseudo of the current webSocket matches that of the current user.
             * If necessary, it is created and connected.
             */
            function check_sh_webSocket() {
                var pseudo = user_service.get_pseudo();
                if (sh_webSocket) {
                    if (sh_webSocket.get_pseudo() === pseudo) {
                        // no problem
                    } else {
                        $log.debug("Current WebSocket doesn't match current user. Creating a new one and closing the old one...");

                        var old_webSocket = sh_webSocket;
                        sh_webSocket = new_sh_webSocket(pseudo);
                        old_webSocket.finish_and_close();
                    }
                } else {
                    $log.debug("Creating the first instance of SH-WebSocket");
                    sh_webSocket = new_sh_webSocket(pseudo);
                }
            }

            /**
             * A function is returned.
             * It is safer to invoke the function each time the webSocket is to be accessed.
             */
            return function () {
                check_sh_webSocket();
                return sh_webSocket;
            };

        }]);
}());
