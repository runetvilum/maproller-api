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
            $scope.emailtemplate.users = $scope.emailtemplate.users || {};
            $scope.emailtemplate.userfields = $scope.emailtemplate.userfields || {};
            $scope.addUser = function () {
                $scope.emailtemplate.users[$scope.user] = {
                    rules: {}
                };
                delete $scope.users[$scope.user];

                $scope.user = null;
            };
            $scope.removeUser = function (key) {
                delete $scope.emailtemplate.users[key];
            };
            $scope.addUserfield = function () {
                $scope.emailtemplate.userfields[$scope.userfield] = {
                    rules: {}
                };
                var i = $scope.keys.indexOf(this.userfield);
                $scope.keys.splice(i, 1);
                $scope.userfield = null;
                $scope.$emit('validate');
            };
            $scope.removeUserfield = function (key) {
                delete $scope.emailtemplate.userfields[key];
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
                    $scope.users[item.value.name] = $scope.allusers[item.value.name] = "";
                    $http.jsonp("http://www.gravatar.com/" + md5.createHash(item.value.name) + ".json?callback=JSON_CALLBACK").
                    success(function (data, status, headers, config) {
                        if (data.entry && data.entry.length > 0 && data.entry[0].name && data.entry[0].name.formatted) {
                            $scope.allusers[item.value.name] = data.entry[0].name.formatted;
                            if (!$scope.emailtemplate.users.hasOwnProperty(item.value.name)) {
                                $scope.users[item.value.name] = data.entry[0].name.formatted;
                            }
                        }

                    }).
                    error(function (data, status, headers, config) {});
                });

            }).
            error(function (data, status, headers, config) {
                console.log(data);
            });
            $scope.keys = [];
            var buildKeys = function (node, parent) {
                for (var key in node) {
                    var localnode = node[key];
                    if (localnode.properties) {
                        buildKeys(localnode.properties, parent + '/' + key);
                    } else if (localnode.oneOf && localnode.oneOf.length > 0) {
                        buildKeys(localnode.oneOf[0].properties, parent + '/' + key);
                    } else {
                        $scope.keys.push(parent + '/' + key);
                    }
                }
            };

            var makeFormSchema = function (node, schema) {
                var properties,
                    key,
                    localnode,
                    i;
                for (key in node) {
                    localnode = node[key];
                    if (key === 'oneOf') {
                        schema.properties = schema.properties || {};
                        for (i = 0; i < localnode.length; i++) {
                            makeFormSchema(localnode[i].properties, schema.properties);
                        }
                    } else if (key === 'enum') {
                        schema.enum = schema.enum || [];
                        for (i = 0; i < localnode.length; i++) {
                            if (schema.enum.indexOf(localnode[i]) === -1)
                                schema.enum.push(localnode[i]);
                        }
                    } else if (Object.prototype.toString.call(localnode) === '[object Object]') {
                        schema[key] = schema[key] || {};
                        makeFormSchema(localnode, schema[key]);
                    } else {
                        schema[key] = localnode;
                    }
                }
            };

            $http.get('/couchdb/db-' + $stateParams.database + '/_design/schema')

            .success(function (data, status, headers, config) {
                $scope.missingSchema = false;
                $scope.schema = {};
                makeFormSchema(data.schema, $scope.schema);
                buildKeys($scope.schema.properties, "");
                for (var key in $scope.emailtemplate.userfields) {
                    var index = $scope.keys.indexOf(key);
                    if (index !== -1) {
                        $scope.keys.splice(index, 1);
                    }
                }

            })

            .error(function (data, status, headers, config) {
                if (status === 404) {
                    $scope.missingSchema = true;
                } else {
                    $scope.errorSchema = data;
                }

            });

        }]);
})(this, this.angular, this.console);