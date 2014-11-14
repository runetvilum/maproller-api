function (newDoc, oldDoc, userCtx, secObj) {
    log(userCtx);
    if (userCtx.roles.indexOf('_admin') !== -1) {
        return;
    } else {
        throw ({
            forbidden: 'Only admins are allowed.'
        });
    }
}