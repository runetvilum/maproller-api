(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('template-security', ['$scope', '$rootScope', '$http', '$stateParams',
        function ($scope, $rootScope, $http, $stateParams) {
            $scope.organizations = {};
            angular.forEach($rootScope.profile.user.organizations, function (item) {
                $scope.organizations[item.id] = {
                    checked: $scope.$parent.template.organizations ? $scope.$parent.template.organizations.indexOf(item.id) !== -1 : false,
                    name: item.value.name
                };
            });
            $scope.change = function (item) {
                var doc = {
                    organizations: []
                };
                for (var key in $scope.organizations) {
                    if ($scope.organizations[key].checked) {
                        doc.organizations.push(key);
                    }
                }
                $scope.$parent.template.organizations = doc.organizations;
                $scope.success = null;
                $scope.error = null;
                $http.put('/api/template/' + $stateParams.template + '/security', doc).
                success(function (data, status, headers, config) {
                    console.log(data);
                    $scope.success = data;
                }).
                error(function (data, status, headers, config) {
                    console.log(data);
                    $scope.error = data;
                });
            };
        }
    ]);
})(this, this.angular, this.console);