(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('databases-create', ['$scope', '$http', '$stateParams', '$state',
        function ($scope, $http, $stateParams, $state) {
            $scope.submit = function (form) {
                $scope.success = null;
                $scope.error = null;
                if (form.$valid) {
                    $http.post('/api/database', {
                        name: $scope.name,
                        organization: $stateParams.organization
                    }).
                    success(function (data, status, headers, config) {
                        $scope.success = true;
                        $scope.name = null;
                        $state.go('organization.databases.list', {
                            organization: $stateParams.organization
                        });
                    }).
                    error(function (data, status, headers, config) {
                        $scope.error = data;
                        console.log(data);
                    });
                }
            };
        }]);
})(this, this.angular, this.console);