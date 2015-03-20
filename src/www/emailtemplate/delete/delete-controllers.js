(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('emailtemplate-delete', ['$scope', '$rootScope', '$http', '$stateParams', '$state',
        function ($scope, $rootScope, $http, $stateParams, $state) {
            $scope.error = null;
            $scope['delete'] = function () {
                $scope.success = null;
                $scope.error = null;
                $http['delete']('/api/emailtemplate/' + $stateParams.emailtemplate).success(function (data, status, headers, config) {
                    $scope.success = data;
                    $state.go('database.emailtemplate.list', {
                        organization: $stateParams.organization,
                        database: $stateParams.database
                    });
                }).error(function (data, status, headers, config) {
                    console.log(data);
                    $scope.error = data;
                });
            };
        }]);
}(this, this.angular, this.console));