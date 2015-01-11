(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('database-delete', ['$scope', '$state', '$http', '$stateParams',
        function ($scope, $state, $http, $stateParams) {
            $scope.error = null;
            $scope.delete = function () {
                $http.delete('/api/database/' + $stateParams.database).
                success(function (data, status, headers, config) {
                    $state.go('organization.databases.list', {
                        organization: $stateParams.organization
                    });
                }).
                error(function (data, status, headers, config) {
                    $scope.error = data;
                });
            };
        }
    ]);
})(this, this.angular, this.console);