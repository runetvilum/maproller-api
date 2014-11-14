(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('templates-list', ['$scope', '$http',
        function ($scope, $http) {
            $http.get('/api/templates').
            success(function (data, status, headers, config) {
                console.log(data);
                $scope.templates = data.rows;
            }).
            error(function (data, status, headers, config) {
                console.log(data);
            });
        }
    ]);
})(this, this.angular, this.console);