(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('users-create', ['$scope', '$state', '$http', '$stateParams',
        function ($scope, $state, $http, $stateParams) {
            $scope.role = $scope.options[0].value;
            $scope.create = function (form) {
                $scope.error = null;
                $scope.success = null;
                if (form.$valid) {
                    $scope.wait = true;
                    $http.post('/api/user', {
                        name: $scope.name,
                        role: $scope.role
                    }).
                    success(function (data, status, headers, config) {
                        console.log(data);
                        /*var item = {
                            id: data.id,
                            value: {
                                _id: data.id,
                                _rev: data.rev,
                                name: $scope.name,
                                timestamp: data.timestamp,
                                role: $scope.role.indexOf('admin_') === -1 ? $scope.options[0] : $scope.options[1],
                                verified: data.verified
                            }
                        };
                        $scope.users.push(item);
                        $http.jsonp("http://www.gravatar.com/" + md5.createHash(item.value.name) + ".json?callback=JSON_CALLBACK").
                        success(function (data, status, headers, config) {
                            if (data.entry && data.entry.length > 0 && data.entry[0].name && data.entry[0].name.formatted) {
                                item.value.fullname = data.entry[0].name.formatted;
                            }

                        }).
                        error(function (data, status, headers, config) {

                        });*/
                        $scope.name = null;
                        form.name.$pristine = true;
                        $scope.wait = false;
                        $state.go('organization.users.list', {
                            organization: $stateParams.organization
                        });

                    }).
                    error(function (data, status, headers, config) {
                        console.log(data);
                        $scope.wait = false;
                        $scope.error = data;
                    });
                } else {
                    form.name.$pristine = false;
                }
            };
        }
    ]);
})(this, this.angular, this.console);