import React, {useEffect, useState} from 'react';
import {BrowserRouter as Router, Redirect, Route, Switch} from 'react-router-dom';
import './css/App.css';

import SignIn from "./pages/SignIn";

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

import AuthService from "./services/auth.service";
import {makeStyles} from "@material-ui/core/styles";
import SchedulerConfig from "./pages/SchedulerConfig";


const useStyles = makeStyles((theme) => ({
    root: {
        paddingBottom: 40
    },
}));


function App() {
    const classes = useStyles();

    const [isLoggedIn, setLoggedIn] = useState(AuthService.isLoggedIn());

    useEffect(()=>{
        AuthService.updateToken();
        return () => {clearTimeout()}
    },[]);


    return (
        <div className={classes.root}>
            <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />

            <Router>
                {isLoggedIn &&<NavBar/>}

                <Switch>
                    <Route exact path="/login" >
                        <SignIn setLoggedIn={setLoggedIn}/>
                    </Route>
                    {!isLoggedIn && <Redirect to={{ pathname: '/login'}} />}

                    <Route exact path="/">
                        <Home/>
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
