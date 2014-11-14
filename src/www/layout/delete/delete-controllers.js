(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('layout-delete', ['$scope', '$rootScope', '$http', '$stateParams', '$state',
        function ($scope, $rootScope, $http, $stateParams, $state) {
            $scope.delete = function () {
                $scope.success = null;
                $scope.error = null;
                $http.delete('/api/layout/' + $stateParams.layout).
                success(function (data, status, headers, config) {
                    console.log(data);

                    $scope.success = true;
                    $state.go('organization.layouts', {
                        organization: $stateParams.organization
                    });
                }).
                error(function (data, status, headers, config) {
                    console.log(data);
                    $scope.error = data;
                });
            };
        }
    ]);
})(this, this.angular, this.console);