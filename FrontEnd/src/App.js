import React, {useEffect, useState} from 'react';
import {BrowserRouter as Router, Redirect, Route, Switch} from 'react-router-dom';
import './css/App.css';

import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";

import Home from "./pages/Home";
import Error from "./pages/Error";
import NavBar from "./components/NavBar";
import NewDevice from "./pages/NewDevice";
import Visibility from "./pages/Visibility";
import TriggerConfig from "./pages/TriggerConfig";
import DefinitionConfig from "./pages/DefinitionConfig";
import RoomConfig from "./pages/RoomConfig";
import UsersConfig from "./pages/UsersConfig";
import DeviceConfig from "./pages/DeviceConfig";

import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';

import AuthService from "./services/auth.service";
import {SocketProvider} from "./SocketContext";
import {useSnackbar} from "notistack";
import {makeStyles} from "@material-ui/core/styles";
import SchedulerConfig from "./pages/SchedulerConfig";


const useStyles = makeStyles((theme) => ({
    root: {
        // textAlign: 'center',
        // backgroundImage:`url(${theme.palette.background.backgroundImage})`,
        // backgroundSize: 'cover',
        paddingBottom: 40
    },
}));

const io = require("socket.io-client");

function App() {
    const classes = useStyles();
    const { enqueueSnackbar, closeSnackbar } = useSnackbar();

    const [socket, setSocket] = useState();
    const [socketConnected, setSocketConnected] = useState(false);
    const [isLoggedIn, setLoggedIn] = useState(AuthService.isLoggedIn());

    useEffect(()=>{
        AuthService.updateToken();
        return () => {clearTimeout()}
    },[]);

    useEffect(()=>{
        const user = AuthService.getCurrentUser()
        console.log('useEffect Socket')
        let socket
        if (isLoggedIn && user) {
            socket = io.io(process.env.REACT_APP_WSS_ENDPOINT, {
                path:'/apiSocket/', reconnectionDelay: 2000, reconnection: true, secure: true,
                extraHeaders: {Authorization: 'Basic ' + user.token}
            })
            setSocket(socket);
            socket.on("connect", () => {
                setSocketConnected(true)
                enqueueSnackbar('Socket connected',{
                    action: key => (
                        <IconButton size="small" aria-label="close" color="inherit"
                                    onClick={() => closeSnackbar(key)}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    ),
                })
            });
            socket.on("disconnect", () => {
                enqueueSnackbar('Socket disconnected', {
                    variant: 'error',
                    action: key => (
                        <IconButton size="small" aria-label="close" color="inherit"
                                    onClick={() => closeSnackbar(key)}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    ),
                })
            });
        }else if(isLoggedIn && !user){
            AuthService.logout()
        }
        return () => {
            console.log('Stop Main Soket')
            if(socket){
                socket.disconnect()
                socket.close()
            }
        }
    },[isLoggedIn]);



    return (
    <div className={classes.root}>
        <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />

        <Router>
            {isLoggedIn &&<NavBar/>}

            <Switch>
                <Route exact path="/login" >
                    <SignIn setLoggedIn={setLoggedIn}/>
                </Route>
                <Route exact path="/signup" component={SignUp}/>
                {!isLoggedIn && <Redirect to={{ pathname: '/login'}} />}

                <Route exact path="/">
                    {socket && socketConnected &&
                        <SocketProvider value={socket}>
                            <Home/>
                        </SocketProvider>
                    }
                </Route>

                <Route exact path="/newdevice" component={NewDevice}/>
                <Route exact path="/rooms" component={RoomConfig}/>
                <Route exact path="/users" component={UsersConfig}/>
                <Route exact path="/error" component={Error}/>
                <Route path="/trigger" component={TriggerConfig}/>
                <Route path="/definitions" component={DefinitionConfig}/>
                <Route exact path="/visibility" component={Visibility}/>
                <Route exact path="/device-config" component={DeviceConfig}/>
                <Route exact path="/schedulers" component={SchedulerConfig}/>

                <Route path='*' exact><h1>Page not found</h1></Route>
            </Switch>
        </Router>
    </div>
    );
}

export default App;
