function (doc) {
    if (doc.type === 'user' && doc.verification_code)
        emit(doc.verification_code, doc);
}