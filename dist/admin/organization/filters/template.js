function (doc, req) {
    if (doc._deleted) {
        return true;
    }
    if (doc.type != 'app') {
        return false;
    }
    if (doc.template != req.query.template) {
        return false;
    }
    return true;
}