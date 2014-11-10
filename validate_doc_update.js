function (newDoc, oldDoc, userCtx, secObj) {
    if (newDoc._deleted !== true && newDoc._id.substring(0, 7) !== '_design') {
        var schema = require('lib/schema').schema;
        var tv4 = require('lib/tv4').tv4;
        if (tv4.validate(newDoc, schema, true, true)) {
            return;
        } else {
            throw ({
                forbidden: {
                    error: tv4.error
                }
            });
        }
    }
}