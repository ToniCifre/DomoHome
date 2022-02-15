import React, {useContext, useEffect, useState} from 'react';

import { makeStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import ButtonBase from "@material-ui/core/ButtonBase";
import Typography from "@material-ui/core/Typography";
import SocketContext from "../../../SocketContext";
import { useTheme } from '@material-ui/core/styles';
import SwitchCardOptions from "./SwitchCardOptions";


const useStyles = makeStyles({
    root: {
        minWidth: 120,
        maxWidth: 120,
        height:'100%'
    },
    ActionIcon:{
        fontSize: '70px !important'
    },
    cardAction: {
        width: '100%',
        height: '100%',
        display: "unset"
    }
});

const SwitchCard = ({sensor, showRoom})  => {
    const theme = useTheme()
    const classes = useStyles();

    const [isOn, setIsOn] = useState(sensor.value);
    const [isConnected, setConnection] = useState(sensor.connect);


    const socket = useContext(SocketContext)

    let colorIcon = "";
    if (isOn && isConnected) colorIcon = theme.palette.secondary.main
    else if (!isConnected) colorIcon="#9e9e9e59"


    const handlePressSwitch = () => {
        const topicValue = sensor.device_id+'/'+sensor.sensor_id+'/set'
        if(isOn === 1) socket.emit('jumpActuator', {'topic': topicValue, 'value': 0});
        else if(isOn === 0) socket.emit('jumpActuator', {'topic': topicValue, 'value': 1});
    }

    useEffect(()=>{
        console.log("useEffect on Actuator card "+sensor.sensor_id)

        socket.on(sensor.sensor_id+'/connStatus', message => {
            if (message) setConnection(true)
            else setConnection(false)
        });
        socket.on(sensor.sensor_id+'/set', message => {
            setIsOn(message)
        });

        return () => {
            socket.off(sensor.sensor_id+'/set');
            socket.off(sensor.sensor_id+'/connStatus');
        }
    },[socket, sensor.sensor_id]);

    return (
        <Card className={classes.root}>
            <SwitchCardOptions sensorId={sensor.sensor_id} deviceId={sensor.device_id}/>
            <ButtonBase className={classes.cardAction} onClick={handlePressSwitch} disabled={!isConnected}>
                <CardContent style={{padding:5}}>
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
            </ButtonBase>
        </Card>
    );
}

export default SwitchCard
