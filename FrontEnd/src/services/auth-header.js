export default function authHeader() {
    if (!!localStorage.getItem('user')){
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.token) {
            return { Authorization: `Bearer ${user.token}` };
        }
    }else {
        console.log('AuthHeader non localstore')
    }
    return {}

}
