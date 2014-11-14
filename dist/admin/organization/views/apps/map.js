function (doc) {
    if (doc.type && doc.type === 'app') {
        emit(doc.organization, {
            name: doc.name,
            template: doc.template
        });
    }
}