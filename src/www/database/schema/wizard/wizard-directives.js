(function (window, angular, console) {
    'use strict';
    /* Directives */
    angular.module('myApp.directives')

    .directive("tree", function ($compile, $http) {
        return {
            restrict: "E",
            scope: {
                schema: '=',
                name: '=',
                propertyType: '=',
                parentSchema: '='
            },
            /*template: '<p>{{ name }}<button type="button" class="btn btn-default" ng-click="slet()">slet</button></p>' +
                '<ul>' +
                '<li ng-repeat="(key,value) in properties">' +
                '<tree name="key" properties="value.properties"></tree>' +
                '</li>' +
                '</ul>',*/
            templateUrl: 'database/schema/wizard/schema.html',
            compile: function (tElement, tAttr) {
                var contents = tElement.contents().remove();
                var compiledContents;
                return function (scope, iElement, iAttr) {
                    if (!compiledContents) {
                        compiledContents = $compile(contents);
                    }
                    compiledContents(scope, function (clone, scope) {
                        iElement.append(clone);
                    });
                };
            },
            controller: function ($scope) {

                $scope.key = $scope.name;
                $scope.slet = function () {
                    delete $scope.$parent.$parent.schema.properties[this.name];
                };

                $scope.additionalProperties = function (newValue) {
                    if (angular.isDefined(newValue)) {
                        $scope.schema.additionalProperties = newValue;
                        $scope.$emit('validate');
                        return $scope.schema.additionalProperties;
                    }
                    if (angular.isDefined($scope.schema.additionalProperties)) {
                        return $scope.schema.additionalProperties;
                    }
                    $scope.schema.additionalProperties = false;
                    return false;
                };
                $scope.schemaType = function (newValue) {
                    if (angular.isDefined(newValue)) {
                        if (angular.isDefined($scope.schema.type)) {
                            if (angular.isArray($scope.schema.type)) {
                                $scope.schema.type[$scope.$index] = newValue;
                            } else {
                                $scope.schema.type = newValue;
                            }
                        } else {
                            $scope.schema.type = newValue;
                        }
                        $scope.$emit('validate');
                        return newValue;
                    }
                    if (angular.isDefined($scope.schema.type)) {
                        if (angular.isArray($scope.schema.type)) {
                            return $scope.schema.type[$scope.$index];
                        } else {
                            return $scope.schema.type;
                        }
                    }
                    return "object";
                };
                $scope.changeRequired = function () {
                    if ($scope.parentSchema.required) {
                        var index = $scope.parentSchema.required.indexOf(this.name);
                        if (index === -1) {
                            $scope.parentSchema.required.push(this.name);
                        } else {
                            $scope.parentSchema.required.splice(index, 1);
                        }
                    } else {
                        $scope.parentSchema.required = [this.name];
                    }
                    $scope.$emit('validate');
                };
                $scope.changeType = function () {
                    var type = angular.isArray($scope.schema.type) ? $scope.schema.type[this.$index] : $scope.schema.type;
                    if ($scope.schema.default) {
                        delete $scope.schema.default;
                    }
                    switch (this.type) {
                    case "array":
                        break;
                    case "boolean":
                        break;
                    case "integer":
                    case "number":
                        if (!((type === 'integer' && this.type == "number") || (type === 'number' && this.type === "integer"))) {
                            if ($scope.schema.multipleOf) {
                                delete $scope.schema.multipleOf;
                            }
                            if ($scope.schema.maximum) {
                                delete $scope.schema.maximum;
                            }
                            if ($scope.schema.exclusiveMaximum) {
                                delete $scope.schema.exclusiveMaximum;
                            }
                            if ($scope.schema.minimum) {
                                delete $scope.schema.minimum;
                            }
                            if ($scope.schema.exclusiveMinimum) {
                                delete $scope.schema.exclusiveMinimum;
                            }
                        }
                        break;
                    case "null":
                        break;
                    case "object":
                        if ($scope.schema.maxProperties) {
                            delete $scope.schema.maxProperties;
                        }
                        if ($scope.schema.minProperties) {
                            delete $scope.schema.minProperties;
                        }
                        if ($scope.schema.properties) {
                            delete $scope.schema.properties;
                        }
                        if ($scope.schema.patternProperties) {
                            delete $scope.schema.patternProperties;
                        }
                        break;
                    case "string":
                        if ($scope.schema.format) {
                            delete $scope.schema.format;
                        }
                        if ($scope.schema.pattern) {
                            delete $scope.schema.pattern;
                        }
                        if ($scope.schema.maxLength) {
                            delete $scope.schema.maxLength;
                        }
                        if ($scope.schema.minLength) {
                            delete $scope.schema.minLength;
                        }
                        break;
                    }
                    //$scope.schema.type[this.$index] = this.type;
                    $scope.$emit('validate');
                };
                $scope.addType = function () {
                    var index = $scope.schema.type.indexOf('string');
                    var types = ['array', 'boolean', 'integer', 'number', 'null', 'object', 'string'];
                    var type = null;
                    for (var item in types) {
                        var name = types[item];
                        if ($scope.schema.type.indexOf(name) === -1) {
                            type = name;
                            break;
                        }
                    }
                    if (type !== null) {
                        $scope.schema.type.push(type);
                        $scope.$emit('validate');
                    }
                };
                $scope.removeType = function (type) {
                    if ($scope.schema.type.length > 1) {
                        var index = $scope.schema.type.indexOf(type);
                        if (index !== -1) {
                            $scope.schema.type.splice(index, 1);
                        }
                        $scope.$emit('validate');
                    }
                };
                $scope.addProperty = function (type, array) {
                    $http.get("/couchdb/_uuids")

                    .success(function (data, status, headers, config) {
                        var item = {
                            title: data.uuids[0],
                            "type": "string"
                        };
                        if (type === 'allOf' || type === 'anyOf' || type === 'oneOf') {

                            if ($scope.schema[type]) {
                                $scope.schema[type].push(item);
                            } else {
                                $scope.schema[type] = [item];
                            }

                        } else if (type === 'items') {

                            if (!$scope.schema[type]) {
                                $scope.schema[type] = item;
                            } else if (Array.isArray($scope.schema[type])) {
                                $scope.schema[type].push(item);
                            } else {
                                $scope.schema[type] = [$scope.schema[type], item];
                            }
                            $scope.$emit('validate');
                        } else {


                            if (!$scope.schema[type]) {
                                $scope.schema[type] = {};
                            }
                            if (array) {
                                $scope.schema[type][data.uuids[0]] = [];
                            } else {
                                $scope.schema[type][data.uuids[0]] = {
                                    "type": "string"
                                };
                            }



                        }
                        $scope.$emit('validate');
                    })

                    .error(function (data, status, headers, config) {

                    });


                };
                $scope.addNot = function () {
                    $scope.schema.not = {
                        "type": "object"
                    };
                    $scope.$emit('validate');
                };
                $scope.removeProperty = function (name) {
                    if ($scope.propertyType === 'not') {
                        delete $scope.$parent.$parent.$parent.$parent.schema.not;
                    } else if ($scope.propertyType === 'allOf' || $scope.propertyType === 'anyOf' || $scope.propertyType === 'oneOf') {
                        $scope.$parent.$parent.$parent.$parent.schema[$scope.propertyType].splice(this.$parent.$parent.$index, 1);
                        if ($scope.$parent.$parent.$parent.$parent.schema[$scope.propertyType].length === 0) {
                            delete $scope.$parent.$parent.$parent.$parent.schema.items;
                        }
                    } else if ($scope.propertyType === 'items') {
                        if (angular.isArray($scope.$parent.$parent.$parent.$parent.schema.items)) {
                            $scope.$parent.$parent.$parent.$parent.schema.items.splice(this.$parent.$parent.$index, 1);
                            if ($scope.$parent.$parent.$parent.$parent.schema.items.length === 1) {
                                $scope.$parent.$parent.$parent.$parent.schema.items = $scope.$parent.$parent.$parent.$parent.schema.items[0];
                            }
                        } else {
                            delete $scope.$parent.$parent.$parent.$parent.schema.items;
                        }
                    } else {
                        delete $scope.$parent.$parent.$parent.$parent.schema[$scope.propertyType][name];
                    }
                    $scope.$emit('validate');
                };
                $scope.addPropertyDependency = function () {
                    $scope.schema.push(this.newPropertyDependency);
                    $scope.$emit('validate');
                };
                $scope.removePropertyDependency = function () {
                    $scope.schema.splice(this.$index, 1);
                    $scope.$emit('validate');
                };
                $scope.addEnum = function () {
                    if (!$scope.schema.enum) {
                        $scope.schema.enum = [];
                    }
                    $scope.schema.enum.push(this.myForm.newEnum.$modelValue);
                    $scope.$emit('validate');
                };
                $scope.removeEnum = function () {
                    $scope.schema.enum.splice(this.$index, 1);
                    if ($scope.schema.enum.length === 0) {
                        delete $scope.schema.enum;
                    }
                    $scope.$emit('validate');
                };

                $scope.changeName = function () {
                    if ($scope.key !== $scope.name) {
                        $scope.$parent.schema.properties[$scope.key] = $scope.$parent.schema.properties[$scope.name];
                        delete $scope.$parent.schema.properties[$scope.name];
                        if ($scope.$parent.schema.required) {
                            var index = $scope.$parent.schema.required.indexOf(this.name);
                            if (index !== -1) {
                                $scope.$parent.schema.required.splice(index, 1);
                                $scope.$parent.schema.required.push($scope.key);
                            }
                        }
                        $scope.name = $scope.key;
                        $scope.$emit('validate');
                    }
                };
            }
        };
    });
})(this, this.angular, this.console);