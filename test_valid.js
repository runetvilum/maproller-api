var tv4 = require('tv4');
var newDoc = {
    "_id": "02DD6958-600D-AF4C-85AD-777426365343",
    "_rev": "1-be58f86b777174f181a5d1a259b922b7",
    "type": "Feature",
    "properties": {
        "art": "Rynket rose",
        "antal": "10"
    },
    "geometry": {
        "type": "Point",
        "coordinates": [
            9.7119140625,
            56.03522578369872
        ]
    }
};
var schema = {
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
            },
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
                "art": {
                    "type": "string",
                    "enum": [
            "Rynket rose",
            "Bjørneklo",
            "Japansk pileurt"
          ],
                    "title": "Artstype"
                },
                "email": {
                    "title": "Navn",
                    "type": "string",
                    "format": "email"
                },
                "antal": {
                    "type": "string",
                    "title": "Antal"
                }
            },
            "required": [
        "art",
        "antal"
      ],
        },
        "_attachments": {
            "type": "object",
            "title": "Tag foto",
            "properties": {
                "billede1": {
                    "type": "object",
                    "title": "Billede 1",
                    "additionalProperties": true
                },
                "billede2": {
                    "type": "object",
                    "additionalProperties": true
                }
            },
            "additionalProperties": true
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
    },
};
if (tv4.validate(newDoc, schema, true, true)) {
    console.log('ok');
} else {
    console.log(tv4.error);
}