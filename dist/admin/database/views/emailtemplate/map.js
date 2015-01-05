function (doc) {
    if (doc.type && doc.type === 'emailtemplate') {
        emit([doc.database, doc.action], doc.name);
    }
}