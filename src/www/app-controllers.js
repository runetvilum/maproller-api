(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers', []).controller('navigation', ['$scope', '$rootScope', '$state', '$http',
        function ($scope, $rootScope, $state, $http) {
            $scope.logoff = function () {
                $http.delete('/api/session').
                success(function (data, status, headers, config) {
                    $rootScope.profile = null;
                    $rootScope.organization = null;
                    $state.go('frontpage');
                }).
                error(function (data, status, headers, config) {});
            };
        }
    ]);
})(this, this.angular, this.console);