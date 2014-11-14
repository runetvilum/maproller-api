(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('user-delete', ['$scope', '$state', '$http', '$stateParams',
        function ($scope, $state, $http, $stateParams) {
            $scope.delete = function () {
                $scope.error = null;
                $scope.success = null;
                $http.delete('/api/user/' + $scope.user._id + '?organization=' + $stateParams.organization).
                success(function (data, status, headers, config) {
                    console.log(data);
                    $state.go('organization.users.list', {
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