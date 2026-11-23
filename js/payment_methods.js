(function () {
    if (!window.RWL || !RWL.getToken()) {
        window.location.href = './login_register.html';
    }
})();
