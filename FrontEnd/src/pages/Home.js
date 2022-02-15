import React from 'react';

import Container from "@material-ui/core/Container";

import NewDevice from "../components/HomePage/NewDevices";
import ListDevices from "../components/HomePage/ListDevices";


const Home = ()  => {
    return (
        <div>
            <NewDevice/>
            <ListDevices/>
        </div>
    )
}

export default Home;
