(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('preview-map', ['$scope', '$rootScope', '$http', '$stateParams',
        function ($scope, $rootScope, $http, $stateParams) {
            $http.get('/api/map/' + $stateParams.map).
            success(function (data, status, headers, config) {
                console.log(data);
                $scope.options = data;
            }).
            error(function (data, status, headers, config) {
                console.log(data);
            });
        }]);
})(this, this.angular, this.console);