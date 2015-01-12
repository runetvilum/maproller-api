function (newDoc, oldDoc, userCtx, secObj) {
    if (newDoc._deleted !== true && newDoc._id.substring(0, 7) !== '_design') {
        var straks = require('lib/straks').straks;

        function inside(pt, polygon) {
            var polys = polygon.geometry.coordinates;
            //var pt = [point.geometry.coordinates[0], point.geometry.coordinates[1]];
            // normalize to multipolygon
            if (polygon.geometry.type === 'Polygon') polys = [polys];

            var insidePoly = false;
            var i = 0;
            while (i < polys.length && !insidePoly) {
                // check if it is in the outer ring first
                if (inRing(pt, polys[i][0])) {
                    var inHole = false;
                    var k = 1;
                    // check for the point in any of the holes
                    while (k < polys[i].length && !inHole) {
                        if (inRing(pt, polys[i][k])) {
                            inHole = true;
                        }
                        k++;
                    }
                    if (!inHole) insidePoly = true;
                }
                i++;
            }
            return insidePoly;
        }

        // pt is [x,y] and ring is [[x,y], [x,y],..]
        function inRing(pt, ring) {
            var isInside = false;
            for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
                var xi = ring[i][0],
                    yi = ring[i][1];
                var xj = ring[j][0],
                    yj = ring[j][1];

                var intersect = ((yi > pt[1]) != (yj > pt[1])) && (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi);
                if (intersect) isInside = !isInside;
            }
            return isInside;
        }

        function testgeometry(feature) {
            var j, k, point;
            switch (newDoc.geometry.type) {
            case 'Point':
                if (!inside(newDoc.geometry.coordinates, feature)) {
                    return false;
                }
                break;
            case 'LineString':
                for (j = 0; j < newDoc.geometry.coordinates.length; j++) {
                    point = newDoc.geometry.coordinates[j];
                    if (!inside(point, feature)) {
                        return false;
                    }
                }
                break;
            case 'Polygon':
                for (j = 0; j < newDoc.geometry.coordinates.length; j++) {
                    var linestring = newDoc.geometry.coordinates[j];
                    for (k = 0; k < linestring.length; k++) {
                        point = linestring[k];
                        if (!inside(point, feature)) {
                            return false;
                        }

                    }
                    break;
                }
            }
            return true;
        }


        if (newDoc.geometry) {
            var key, l, point;
            for (key in straks) {
                var item = straks[key];
                if (item.inside) {
                    for (l = 0; l < item.geojson.features.length; l += 1) {
                        var feature = item.geojson.features[l];
                        if (testgeometry(feature)) {
                            return true;
                        }
                    }
                }
            }
        }
        throw ({
            forbidden: {
                error: "Indberetning er ikke indenfor det godkendte område!"
            }
        });
    }
    return;
}