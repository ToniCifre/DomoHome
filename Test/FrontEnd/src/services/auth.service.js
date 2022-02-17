import axios from "axios";
import authHeader from "./auth-header";

const API_URL = process.env.REACT_APP_API_ENDPOINT+"/api/v1/auth/";
let updateTokenTimeout = 0

const getCurrentUser = () => {
    return JSON.parse(localStorage.getItem("user"));
};

const register = (username, password) => {
    return axios.post(API_URL + "signup", {username, password,});
};

const login = (username, password) => {
    return axios
        .post(API_URL + "login", {username, password})
        .then((response) => {
            if (response.data.token) {
                localStorage.setItem("user", JSON.stringify(response.data));
            }
            return response.data.user;
        });
};

const updateToken = () => {
    clearTimeout(updateTokenTimeout);

    const user = getCurrentUser()
    if (user){
        const time = (user.exp-300)*1000 - Date.now()
        console.log('Updating Token')
        axios.get(API_URL+'token', {headers: authHeader()})
            .then((response) => {
                if (response.data.token) {
                    localStorage.setItem("user", JSON.stringify(response.data));
                }
            }).catch(reason => {
            console.log(reason)
            localStorage.removeItem("user");
            window.location.href = '/'
        });
        console.log('next update in ', time)
        updateTokenTimeout = setTimeout(() => updateToken(), time);
    }
};

export const logout = () => {
    localStorage.removeItem("user");
    window.location.href = '/login'
};

const isLoggedIn = () => {
    return !!localStorage.getItem("user");
};

export default {
    register,
    login,
    logout,
    updateToken,
    getCurrentUser,
    isLoggedIn
};
