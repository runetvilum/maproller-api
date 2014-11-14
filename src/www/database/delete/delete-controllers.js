(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('database-delete', ['$scope', '$state', '$http', '$stateParams',
        function ($scope, $state, $http, $stateParams) {
            $scope.delete = function () {
                $http.delete('/api/database/' + $stateParams.database).
                success(function (data, status, headers, config) {
                    console.log(data);
                    $state.go('organization.databases.list', {
                        organization: $stateParams.organization
                    });

                }).
                error(function (data, status, headers, config) {
                    console.log(data);
                });
            };
        }
    ]);
})(this, this.angular, this.console);