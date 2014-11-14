/*jshint -W054 */
(function (window, angular, console, L) {
    'use strict';
    /* Directives */
    angular.module('myApp.directives').directive('layoutMap', ['$http', '$q',
        function ($http, $q) {
            var map,
                baselayers = {},
                overlays = {};
            return {
                link: function (scope, element, attrs) {
                    map = new L.Map(element[0], {
                        center: L.latLng(55.9, 11.8),
                        zoom: 1
                    });

                    

                    scope.removeLeafletLayer = function (id, overlay) {
                        if (overlay) {
                            map.removeLayer(overlays[id].layer);
                            delete overlays[id];
                        } else {
                            map.removeLayer(baselayers[id].layer);
                            delete baselayers[id];
                            for (var key in baselayers) {
                                var value = baselayers[key];
                                value.visible = true;
                                setBaselayer(value);
                                break;
                            }
                        }
                    };
                    var setBaselayer = function (layer) {
                        if ('EPSG:' + layer.data.epsg !== map.options.crs.code) {
                            var bounds = map.getBounds();
                            map.remove();
                            if (layer.data.epsg === "25832") {
                                map = new L.Map(element[0], {
                                    crs: new L.Proj.CRS.TMS('EPSG:25832',
                                        '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs', [120000, 5900000, 1000000, 6500000], {
                                            resolutions: [1638.4, 819.2, 409.6, 204.8, 102.4, 51.2, 25.6, 12.8, 6.4, 3.2, 1.6, 0.8, 0.4, 0.2, 0.1]
                                        }),
                                    center: L.latLng(55.9, 11.8),
                                    zoom: 1
                                });
                            } else {
                                map = new L.Map(element[0], {
                                    center: L.latLng(55.9, 11.8),
                                    zoom: 1
                                });
                            }
                            map.addLayer(layer.layer);
                            map.fitBounds(bounds);

                            angular.forEach(overlays, function (value, key) {
                                value.layer = createLayer(value.data);
                                if (value.visible) {
                                    map.addLayer(value.layer);
                                }
                            });
                            angular.forEach(baselayers, function (value, key) {
                                if (!value.visible) {
                                    value.layer = createLayer(value.data);
                                }
                            });
                        } else {
                            map.addLayer(layer.layer);
                        }
                    };
                    scope.selectBaselayer = function (id) {
                        for (var key in baselayers) {
                            var value = baselayers[key];
                            if (value.visible) {
                                map.removeLayer(value.layer);
                                value.visible = false;
                            }
                        }
                        var baselayer = baselayers[id];
                        baselayer.visible = true;
                        if ('EPSG:' + baselayer.epsg !== map.options.crs.code) {
                            //createLayer(id).then(function (res) {
                            setBaselayer(baselayer);
                            //});
                        } else {
                            map.addLayer(baselayers[id].layer);
                        }
                    };
                    scope.selectOverlay = function (id) {
                        var layer = overlays[id];
                        if (layer.visible) {
                            map.removeLayer(layer.layer);
                        } else {
                            map.addLayer(layer.layer);
                        }
                        layer.visible = !layer.visible;
                    };
                    var createLayer = function (data) {
                        var jsonTransformed = {};
                        if (data.options) {
                            jsonTransformed = JSON.parse(data.options, function (key, value) {
                                if (value && (typeof value === 'string') && value.indexOf("function") === 0) {
                                    // we can only pass a function as string in JSON ==> doing a real function
                                    //eval("var jsFunc = " + value);
                                    var jsFunc = new Function('return ' + value)();
                                    return jsFunc;
                                }
                                return value;
                            });
                        }
                        jsonTransformed.ticket = scope.ticket;
                        var layer;
                        if (data.mapType === 'xyz') {
                            layer = L.tileLayer(data.url, jsonTransformed);
                        } else if (data.mapType === 'wms') {
                            jsonTransformed = angular.extend(jsonTransformed, data.wms);
                            layer = L.tileLayer.wms(data.url, jsonTransformed);
                        } else if (data.mapType === 'geojson') {
                            layer = L.geoJson(null, jsonTransformed);
                            $http.get('/couchdb/db-' + data.database + '/_all_docs?include_docs=true').
                            success(function (data, status, headers, config) {

                                for (var i = 0; i < data.rows.length; i++) {
                                    var doc = data.rows[i].doc;
                                    if (doc._id !== "_design/security") {
                                        layer.addData(doc);
                                    }
                                }
                                map.fitBounds(layer.getBounds());
                            }).
                            error(function (data, status, headers, config) {
                                console.log(data);
                            });
                        } else if (data.mapType === 'mbtiles') {
                            //http://tilestream.maproller.org/api/Tileset
                            //jsonTransformed.tms = true;
                            if (data.minzoom) {
                                jsonTransformed.minZoom = data.minzoom;
                            }
                            if (data.maxzoom) {
                                jsonTransformed.maxZoom = data.maxzoom;
                            }
                            if (data.bounds) {
                                var bounds2 = data.bounds.split(',');
                                if (bounds2.length == 4) {
                                    jsonTransformed.bounds = [[bounds2[1], bounds2[0]], [bounds2[3], bounds2[2]]];
                                }
                            }
                            layer = L.tileLayer('http://{s}.tilestream.maproller.org/v2/' + data._id + '/{z}/{x}/{y}.' + data.format, jsonTransformed);
                            //layer = L.tileLayer('http://localhost:8888/v2/' + data._id + '/{z}/{x}/{y}.' + data.format, jsonTransformed);
                        }

                        return layer;
                    };
                    scope.addLeafletLayer = function (id, isOverlay, isVisible) {
                        $http.get('/api/map/' + id).
                        success(function (data, status, headers, config) {
                            if (!map) {
                                if (data.epsg === "25832") {
                                    map = new L.Map(element[0], {
                                        crs: new L.Proj.CRS.TMS('EPSG:25832',
                                            '+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs', [120000, 5900000, 1000000, 6500000], {
                                                resolutions: [1638.4, 819.2, 409.6, 204.8, 102.4, 51.2, 25.6, 12.8, 6.4, 3.2, 1.6, 0.8, 0.4, 0.2, 0.1]
                                            }),
                                        center: L.latLng(55.9, 11.8),
                                        zoom: 1
                                    });
                                } else {
                                    map = new L.Map(element[0], {
                                        center: L.latLng(55.9, 11.8),
                                        zoom: 5
                                    });
                                }
                            }
                            var layer = createLayer(data);
                            if (isOverlay) {

                                overlays[id] = {
                                    visible: isVisible,
                                    layer: layer,
                                    data: data
                                };
                                if (isVisible) {
                                    map.addLayer(layer);
                                }

                            } else {
                                for (var key in baselayers) {
                                    var value = baselayers[key];
                                    if (value.visible) {
                                        map.removeLayer(value.layer);
                                        value.visible = false;
                                    }
                                }
                                baselayers[id] = {
                                    visible: true,
                                    layer: layer,
                                    data: data
                                };
                                setBaselayer(baselayers[id]);
                            }
                        });
                    };
                    var key;
                    for (key in scope.$parent.layout.baselayers) {
                        var baselayer = scope.$parent.layout.baselayers[key];
                        scope.addLeafletLayer(key, false, baselayer.active);
                    }
                    for (key in scope.$parent.layout.overlays) {
                        var overlay = scope.$parent.layout.overlays[key];
                        scope.addLeafletLayer(key, true, overlay.active);
                    }
                }
            };
        }
    ]);
})(this, this.angular, this.console, this.L);