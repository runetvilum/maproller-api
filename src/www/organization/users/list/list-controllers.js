(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('users-list', ['$scope', 'md5', '$http', '$stateParams',
        function ($scope, md5, $http, $stateParams) {
            $http.get('/api/users/' + $stateParams.organization).
            success(function (data, status, headers, config) {
                console.log(data);
                $scope.users = data.rows;
                angular.forEach(data.rows, function (item) {
                    var role_user = item.value.roles.indexOf('user_' + $stateParams.organization);
                    var role_admin = item.value.roles.indexOf('admin_' + $stateParams.organization);
                    var role_sys = item.value.roles.indexOf('sys');
                    if (role_user !== -1) {
                        item.value.role = $scope.options[0];
                    } else if (role_admin !== -1) {
                        item.value.role = $scope.options[1];
                    }
                    $http.jsonp("http://www.gravatar.com/" + md5.createHash(item.value.name) + ".json?callback=JSON_CALLBACK").
                    success(function (data, status, headers, config) {
                        if (data.entry && data.entry.length > 0 && data.entry[0].name && data.entry[0].name.formatted) {
                            item.value.fullname = data.entry[0].name.formatted;
                        }

                    }).
                    error(function (data, status, headers, config) {});
                });

            }).
            error(function (data, status, headers, config) {
                console.log(data);
            });
        }
    ]);
})(this, this.angular, this.console);