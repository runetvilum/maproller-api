function (doc) {
    if (doc.type && doc.type === 'template') {
        emit(doc.name, null);
    }
}