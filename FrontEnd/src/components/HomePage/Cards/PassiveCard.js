import React, {useContext, useEffect, useState} from 'react';

import { makeStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Typography from "@material-ui/core/Typography";
import SocketContext from "../../../SocketContext";
import { useTheme } from '@material-ui/core/styles';


const useStyles = makeStyles({
    root: {
        width: 125,
        height:'100%'
    },
    cardContent: {
        padding: '5px !important',
        textAlign: 'center'
    },
    ActionIcon:{
        fontSize: '70px !important'
    }
});

const PassiveCard = ({sensor, showRoom})  => {
    const theme = useTheme()
    const classes = useStyles();

    const [isOn, setIsOn] = useState(sensor.value);
    const [isConnected, setConnection] = useState(sensor.connect);
    const [colorIcon, setColorIcon] = useState(theme.palette.secondary.main);

    const socket = useContext(SocketContext)

    const checkColor = () =>{
        if (isOn && isConnected) setColorIcon(theme.palette.secondary.main)
        else if (isConnected) setColorIcon("")
        else setColorIcon("#9e9e9e59")
    }

    useEffect(()=>{
        checkColor()

        console.log("useEffect on Actuator card "+sensor.sensor_id)
        socket.on(sensor.sensor_id+'/connStatus', message => {
            if (message) setConnection(true)
            else setConnection(false)
            checkColor()
        });
        socket.on(sensor.sensor_id+'/set', message => {
            setIsOn(message)
            checkColor()
        });

        return () => {
            socket.off(sensor.sensor_id+'/set');
            socket.off(sensor.sensor_id+'/connStatus');
        }
    },[socket, sensor.sensor_id]);

    return (
        <Card className={classes.root}>
            <CardContent className={classes.cardContent}>
                <span className={`material-icons ${classes.ActionIcon}`} style={{color: colorIcon}}>
                    {sensor.icon}
                </span>
                {showRoom && <Typography variant="caption" display="block" style={{color: '#808080'}} gutterBottom>
                    {sensor.room}
                </Typography>}
                <Typography gutterBottom variant="h6" component="h6">
                    {sensor.name}
                </Typography>
            </CardContent>
        </Card>
    );
}

export default PassiveCard

