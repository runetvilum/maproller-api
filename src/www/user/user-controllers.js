(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('user', ['$scope', '$rootScope', 'md5', '$http', '$stateParams',
        function ($scope, $rootScope, md5, $http, $stateParams) {
            
            $http.get('/api/user/' + $stateParams.user).
            success(function (data, status, headers, config) {
                console.log(data);
                if (data.roles.indexOf('admin_' + $stateParams.organization) !== -1) {
                    data.role = 'admin_' + $stateParams.organization;
                } else {
                    data.role = 'user_' + $stateParams.organization;
                }
                
                $scope.user = data;
                $scope.user.sys = data.roles.indexOf('sys') !== -1;
                $scope.$watch('user.role', function (newValue, oldValue) {
                    if (newValue !== oldValue) {
                        $scope.error = null;
                        $scope.success = null;
                        $http.put('/api/user', $scope.user).
                        success(function (data, status, headers, config) {
                            console.log(data);
                            $scope.success = true;
                        }).
                        error(function (data, status, headers, config) {
                            $scope.error = data;
                        });
                    }
                });
                $http.jsonp("http://www.gravatar.com/" + md5.createHash(data.name) + ".json?callback=JSON_CALLBACK").success(function (data, status, headers, config) {
                    if (data.entry && data.entry.length > 0 && data.entry[0].name && data.entry[0].name.formatted) {
                        $scope.fullname = data.entry[0].name.formatted;
                    }

                }).error(function (data, status, headers, config) {});
            }).
            error(function (data, status, headers, config) {
                console.log(data);
            });
        }
    ]);
})(this, this.angular, this.console);