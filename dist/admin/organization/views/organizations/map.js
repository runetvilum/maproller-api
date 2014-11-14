function (doc) {
    if (doc.type && doc.type === 'organization') {
        emit(doc._id, doc);
    }
}