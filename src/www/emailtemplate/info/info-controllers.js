(function (window, angular, console) {
    'use strict';
    angular.module('myApp.controllers').controller('emailtemplate-info', ['$scope', '$rootScope', '$http', '$stateParams', 'md5',
        function ($scope, $rootScope, $http, $stateParams, md5) {
            $scope.actions = [{
                name: 'Opret',
                value: 'create'
            }, {
                name: 'Opdater',
                value: 'update'
            }, {
                name: 'Slet',
                value: 'delete'
            }];
            $scope.emailtemplate.users = $scope.emailtemplate.users || [];
            $scope.addListField = function () {
                $scope.emailtemplate.users.push($scope.user);
                delete $scope.users[$scope.user];

                $scope.user = null;
            };
            $scope.removeListField = function (key) {
                $scope.users[key] = $scope.allusers[key];
                $scope.emailtemplate.users.splice(this.$index, 1);
            };
            $scope.update = function (form) {
                $scope.success = null;
                $scope.$parent.error = null;
                if (form.$valid) {

                    $http.put('/api/emailtemplate', $scope.$parent.emailtemplate).
                    success(function (data, status, headers, config) {
                        console.log(data);
                        $scope.success = true;
                        $scope.$parent.emailtemplate = data.doc;
                        $scope.$parent.html = data.html;
                        $scope.$parent.text = data.text;
                        $scope.$parent.error = data.err;
                    }).
                    error(function (data, status, headers, config) {
                        $scope.$parent.error = data;
                    });
                }
            };
            $http.get('/api/users/' + $stateParams.organization).
            success(function (data, status, headers, config) {
                console.log(data);
                $scope.users = {};
                $scope.allusers = {};
                angular.forEach(data.rows, function (item) {
                    $scope.allusers[item.id] = $scope.users[item.id] = {
                        name: item.id.substring(17)
                    };
                    $http.jsonp("http://www.gravatar.com/" + md5.createHash(item.value.name) + ".json?callback=JSON_CALLBACK").
                    success(function (data, status, headers, config) {
                        if (data.entry && data.entry.length > 0 && data.entry[0].name && data.entry[0].name.formatted) {
                            $scope.users[item.id].name = item.id.substring(17) + ', ' + data.entry[0].name.formatted;
                        }

                    }).
                    error(function (data, status, headers, config) {});
                });

            }).
            error(function (data, status, headers, config) {
                console.log(data);
            });
        }]);
})(this, this.angular, this.console);