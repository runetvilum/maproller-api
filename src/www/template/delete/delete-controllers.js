(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('template-delete', ['$scope', '$http', '$stateParams', '$state',
        function ($scope, $http, $stateParams, $state) {
            $scope.delete = function () {
                $scope.success = null;
                $scope.error = null;
                $http.delete('/api/template/' + $stateParams.template).
                success(function (data, status, headers, config) {
                    console.log(data);
                    $state.go('templates.list');
                    $scope.success = true;
                }).
                error(function (data, status, headers, config) {
                    console.log(data);
                    $scope.error = data;
                });
            };
        }
    ]);
})(this, this.angular, this.console);