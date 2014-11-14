(function (window, angular, console) {
    'use strict';
    angular.module('myApp.services').service('kfticket', ['$q', '$http', '$rootScope', '$browser',
        function ($q, $http, $rootScope, $browser) {
            var deferred = $q.defer();
            var cookies = $browser.cookies();
            if (cookies.kfticket) {
                window.setTimeout(function () {
                    deferred.resolve(cookies.kfticket);
                }, 0);
            } else {
                $http.get("/api/kfticket").
                success(function (data, status, headers, config) {
                    cookies = $browser.cookies();
                    deferred.resolve(cookies.kfticket);
                }).
                error(function (data, status, headers, config) {
                    deferred.reject();
                });
            }
            return deferred.promise;
        }
    ]);
})(this, this.angular, this.console);