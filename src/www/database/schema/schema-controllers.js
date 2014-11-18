(function (window, angular, console, tv4) {
    'use strict';
    angular.module('myApp.controllers').controller('database-schema', ['$scope', '$http', '$stateParams',
        function ($scope, $http, $stateParams) {
            $scope.missing = true;
            tv4.addSchema(schemaV4);
            tv4.addSchema(crs_schema);
            tv4.addSchema(bbox_schema);
            tv4.addSchema(geometry_schema);
            tv4.addSchema(geojson_schema);
            
            $http.get('/couchdb/db-' + $stateParams.database + '/_design/schema')

            .success(function (data, status, headers, config) {
                $scope.missing = false;
                $scope.schema = data.schema;
            })

            .error(function (data, status, headers, config) {
                if (status === 404) {
                    $scope.missing = true;
                } else {
                    $scope.error = data;
                }
                $scope.createGeoJSONSchema();
            });
            $scope.createBlankSchema = function () {
                $scope.schema = {
                    "$schema": "http://json-schema.org/draft-04/schema#",
                    "title": $scope.$parent.data.database.name,
                    "description": "",
                    "type": ["object"],
                    properties: {},
                    required: [],
                    dependencies: {}
                };
            };
            $scope.createGeoJSONSchema = function () {
                $scope.schema = {
                    "$schema": "http://json-schema.org/draft-04/schema#",
                    "title": "Projekt",
                    "description": "",
                    "type": [
    "object"
  ],
                    "properties": {
                        "_id": {
                            "type": "string"
                        },
                        "_rev": {
                            "type": "string"
                        },
                        "_revisions": {
                            "type": "object",
                            "properties": {
                                "start": {
                                    "type": "integer"
                                },
                                "ids": {
                                    "type": "array"
                                }
                            }
                        },
                        "type": {
                            "enum": [
        "Feature"
      ]
                        },
                        "geometry": {
                            "title": "geometry",
                            "description": "One geometry as defined by GeoJSON",
                            "type": "object",
                            "required": [
        "type",
        "coordinates"
      ],
                            "oneOf": [
                                {
                                    "title": "Point",
                                    "properties": {
                                        "type": {
                                            "enum": [
                "Point"
              ]
                                        },
                                        "coordinates": {
                                            "$ref": "#/definitions/position"
                                        }
                                    }
        },
                                {
                                    "title": "MultiPoint",
                                    "properties": {
                                        "type": {
                                            "enum": [
                "MultiPoint"
              ]
                                        },
                                        "coordinates": {
                                            "$ref": "#/definitions/positionArray"
                                        }
                                    }
        },
                                {
                                    "title": "LineString",
                                    "properties": {
                                        "type": {
                                            "enum": [
                "LineString"
              ]
                                        },
                                        "coordinates": {
                                            "$ref": "#/definitions/lineString"
                                        }
                                    }
        },
                                {
                                    "title": "MultiLineString",
                                    "properties": {
                                        "type": {
                                            "enum": [
                "MultiLineString"
              ]
                                        },
                                        "coordinates": {
                                            "type": "array",
                                            "items": {
                                                "$ref": "#/definitions/lineString"
                                            }
                                        }
                                    }
        },
                                {
                                    "title": "Polygon",
                                    "properties": {
                                        "type": {
                                            "enum": [
                "Polygon"
              ]
                                        },
                                        "coordinates": {
                                            "$ref": "#/definitions/polygon"
                                        }
                                    }
        },
                                {
                                    "title": "MultiPolygon",
                                    "properties": {
                                        "type": {
                                            "enum": [
                "MultiPolygon"
              ]
                                        },
                                        "coordinates": {
                                            "type": "array",
                                            "items": {
                                                "$ref": "#/definitions/polygon"
                                            }
                                        }
                                    }
        }
      ]
                        },
                        "properties": {
                            "type": "object",
                            "properties": {
                                "name": {
                                    "title": "Navn",
                                    "type": "string"
                                }
                            }
                        }
                    },
                    "required": [
    "properties",
    "type",
    "geometry"
  ],
                    "definitions": {
                        "position": {
                            "description": "A single position",
                            "type": "array",
                            "minItems": 2,
                            "items": [
                                {
                                    "type": "number"
        },
                                {
                                    "type": "number"
        }
      ],
                            "additionalItems": false
                        },
                        "positionArray": {
                            "description": "An array of positions",
                            "type": "array",
                            "items": {
                                "$ref": "#/definitions/position"
                            }
                        },
                        "lineString": {
                            "description": "An array of two or more positions",
                            "allOf": [
                                {
                                    "$ref": "#/definitions/positionArray"
        },
                                {
                                    "minItems": 2
        }
      ]
                        },
                        "linearRing": {
                            "description": "An array of four positions where the first equals the last",
                            "allOf": [
                                {
                                    "$ref": "#/definitions/positionArray"
        },
                                {
                                    "minItems": 4
        }
      ]
                        },
                        "polygon": {
                            "description": "An array of linear rings",
                            "type": "array",
                            "items": {
                                "$ref": "#/definitions/linearRing"
                            }
                        }
                    }
                };
            };
            $scope.$on('validate', function () {
                var tv4_valid = tv4.validate($scope.schema, "http://json-schema.org/draft-04/schema");
                $scope.valid = {
                    valid: tv4_valid,
                    errors: tv4.error

                };
            });
            $scope.save = function () {
                $scope.error = null;
                $scope.success = null;
                $http.put('/api/database/' + $stateParams.database + '/schema', {
                    schema: $scope.schema
                }).
                success(function (data, status, headers, config) {
                    $scope.valid = null;
                    $scope.success = data;
                    $scope.missing = false;
                }).
                error(function (data, status, headers, config) {
                    $scope.error = data;
                });
            };

            $scope.addEnum = function () {
                if (!$scope.enums) {
                    $scope.enums = [];
                }
                $scope.enums.push("a");

            };
            $scope.removeEnum = function () {
                $scope.enums.splice($scope.$index, 1);
                if ($scope.enums.length === 0) {
                    delete $scope.schema.enums;
                }
            };
        }
    ]);
})(this, this.angular, this.console, this.tv4);