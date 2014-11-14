function (doc) {
    if (doc.type && doc.type === 'template' && doc.organizations) {
        for (var i = 0; i < doc.organizations.length; i++) {
            emit(doc.organizations[i], doc.name);
        }
    }
}