function (doc) {
    if (doc.type && doc.type === 'layout') {
        emit(doc.organization, doc.name);
    }
}