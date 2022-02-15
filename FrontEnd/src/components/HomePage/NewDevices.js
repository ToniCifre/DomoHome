import React, {useContext, useEffect, useState} from 'react';
import { useHistory } from "react-router-dom";

import { makeStyles } from '@material-ui/core/styles';
import Typography from "@material-ui/core/Typography";
import Button from '@material-ui/core/Button';
import {Box} from "@material-ui/core";
import Grid from "@material-ui/core/Grid";

import SocketContext from "../../SocketContext";

const useStyles = makeStyles({
    buttonText: {
        margin: '6px, 0px',
    }
});

const NewDevice = ()  => {
    const classes = useStyles();
    const history = useHistory();

    const [devices, setDevices] = useState({});
    const socket = useContext(SocketContext);

    useEffect(()=>{
        console.log("useEffect NewDevices")
        let dev = {}
        socket.on("newDevice", message => {
            console.log(message)
            console.log(dev)
            const aux = Object.assign({}, dev, message)
            dev = aux

            setDevices(aux);
            console.log('=============================')

        });

        return () => {
            socket.off('newDevice');
        }
    },[]);


    const goLogin = (device, sensors) => history.push({pathname: 'newdevice', state: {device:device, sensors:sensors}});

    const renderSensors = (device, sensors) =>{
        return(
            <Button variant="outlined" onClick={() => goLogin(device, sensors)}>
                <Typography gutterBottom variant="h6" component="h6" className={classes.buttonText} >
                    {device}
                </Typography>
            </Button>
        );
    }
    if (Object.keys(devices).length > 0){
        return (
            <Box bgcolor="background.darker" boxShadow={2} borderRadius="20px" p={2} style={{paddingBottom: 30}}>
                <Typography variant="h4" gutterBottom align={"center"}>
                    New Devices
                </Typography>
                <Grid container direction="row" justify="center" alignItems="stretch" spacing={2} style={{marginTop: 3}}>
                    {Object.entries(devices).map(([device, sensors]) =>
                        <Grid item key={device}>
                            {renderSensors(device,sensors)}
                        </Grid>
                    )}
                </Grid>
            </Box>
        );
    } else{return ('');}

}

export default NewDevice
