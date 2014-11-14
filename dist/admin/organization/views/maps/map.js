function (doc) {
    if (doc.type && doc.type === 'map') {
        emit(doc.organization, doc);
    }
}