(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('layouts-list', ['$scope', '$http', '$stateParams',
        function ($scope, $http, $stateParams) {
            $http.get('/api/layouts/' + $stateParams.organization).
            success(function (data, status, headers, config) {
                console.log(data);
                $scope.layouts = data.rows;
            }).
            error(function (data, status, headers, config) {
                console.log(data);
            });
        }]);
})(this, this.angular, this.console);