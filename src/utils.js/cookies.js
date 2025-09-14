export const setAuthCookie = (res, token) => {
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
};

export const clearAuthCookie = (res) => {
    res.cookie('token', null, {
      httpOnly: true,
      maxAge: 0,
    });
}