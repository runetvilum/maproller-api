(function (window, angular, console) {
    'use strict';
    /* Directives */
    angular.module('myApp.directives')

    .directive("emailuser", function ($compile, $http, $stateParams) {
        return {
            restrict: "E",
            scope: {
                user: '=',
                key: '=',
                allusers: "=",
                removeUser: "&"
            },
            templateUrl: 'emailtemplate/info/user.html',
            controller: function ($scope) {
                $scope.schemafield = null;
                $scope.ruletype = {};
                $scope.addRule = function (key) {
                    $scope.user.rules[this.schemafield] = "";
                    var i = $scope.keys.indexOf(this.schemafield);
                    $scope.keys.splice(i, 1);
                    $scope.schemafield = null;
                    $scope.$emit('validate');
                };
                $scope.removeRule = function (key) {
                    $scope.keys.push(key);
                    delete $scope.user.rules[key];
                    $scope.$emit('validate');
                };
                $scope.keys = [];
                var schemapath = function (input, doc) {
                    var path = input.split('/');
                    var item = doc;
                    var key;
                    for (var m = 1; m < path.length; m++) {
                        key = path[m];
                        if (item.properties && item.properties.hasOwnProperty(key)) {
                            item = item.properties[key];
                        }
                    }
                    return item;
                };
                var buildKeys = function (node, parent) {
                    for (var key in node) {
                        var localnode = node[key];
                        if (localnode.properties) {
                            buildKeys(localnode.properties, parent + '/' + key);
                        } else if (localnode.oneOf && localnode.oneOf.length > 0) {
                            buildKeys(localnode.oneOf[0].properties, parent + '/' + key);
                        } else {
                            $scope.keys.push(parent + '/' + key);
                            $scope.ruletype[parent + '/' + key] = localnode;
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


                    $scope.user.rules = $scope.user.rules || {};


                    for (var key in $scope.user.rules) {
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
            }
        };
    });
})(this, this.angular, this.console);