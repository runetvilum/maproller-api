(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('organization-delete', ['$scope', '$rootScope', '$http', '$stateParams', '$filter', '$location',
        function ($scope, $rootScope, $http, $stateParams, $filter, $location) {
            $scope.$parent.menu=$stateParams.menu;
            $scope.delete = function () {
                $scope.success = null;
                $scope.error = null;
                $http.delete('/api/organization/' + $stateParams.organization).
                success(function (data, status, headers, config) {
                    console.log(data);
                    $rootScope.profile.user.organizations = $filter('filter')($rootScope.profile.user.organizations, {
                        id: '!' + $stateParams.organization
                    });
                    $location.path('/organizations');
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