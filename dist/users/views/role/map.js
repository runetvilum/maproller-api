function (doc) {
    doc.roles.forEach(function(role) {
    emit(role.replace("admin_","").replace("user_",""), doc);
  });
}