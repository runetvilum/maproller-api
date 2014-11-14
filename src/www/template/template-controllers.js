(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('template', ['$scope', '$http','$stateParams',
        function ($scope, $http, $stateParams) {
            $http.get('/api/template/'+$stateParams.template).
            success(function (data, status, headers, config) {
                console.log(data);
                $scope.template = data;
                $scope.name = data.name;
            }).
            error(function (data, status, headers, config) {
                console.log(data);
            });
            
        }
    ]);
})(this, this.angular, this.console);