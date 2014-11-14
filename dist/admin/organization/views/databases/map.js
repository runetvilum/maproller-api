function (doc) {
    if (doc.type && doc.type === 'database') {
        emit(doc.organization, doc.name);
    }
}