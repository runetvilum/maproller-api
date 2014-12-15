(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('organizations-create', ['$scope', '$rootScope', '$http', 
        function ($scope, $rootScope, $http) {
            $scope.success = null;
            $scope.error = null;
            $scope.showForm = false;
            $scope.submit = function (form) {
                $scope.success = null;
                $scope.error = null;
                if (form.$valid) {
                    $http.post('/api/organization', {
                        name: $scope.name
                    }).
                    success(function (data, status, headers, config) {
                        console.log(data);
                        $rootScope.profile.user.organizations.push({
                            key: data.id,
                            id: data.id,
                            value: {
                                _id: data.id,
                                _rev: data.rev,
                                name: $scope.name
                            }
                        });
                        $scope.name = null;
                        form.name.$pristine = true;
                        $scope.success = true;
                    }).
                    error(function (data, status, headers, config) {
                        console.log(data);
                        $scope.error = data;
                    });
                } else {
                    form.name.$pristine = false;
                }
            };
        }
    ]);
})(this, this.angular, this.console);