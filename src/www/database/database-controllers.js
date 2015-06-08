(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('database', ['$scope', '$rootScope', '$http', '$stateParams', 'data',
        function ($scope, $rootScope, $http, $stateParams, data) {
            $scope.data = data;
            $scope.stateParams = $stateParams;
            $http.get('/api/organization/' + data.database.organization).
            success(function (data, status, headers, config) {
                $rootScope.organization = data;
            }).
            error(function (data, status, headers, config) {
            });
        }
    ]);
})(this, this.angular, this.console);