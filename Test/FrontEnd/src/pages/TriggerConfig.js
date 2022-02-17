import React from 'react';

import Container from "@material-ui/core/Container";

import TriggerList from "../components/TriggerPage/TriggerList";


const TriggerConfig = ()  => {
    return (
        <Container maxWidth={"md"} disableGutters >
            <TriggerList/>
        </Container>
    )
}

export default TriggerConfig;
