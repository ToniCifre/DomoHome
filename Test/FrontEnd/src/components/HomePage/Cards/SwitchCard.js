import React, {useState} from 'react';

import { makeStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import ButtonBase from "@material-ui/core/ButtonBase";
import Typography from "@material-ui/core/Typography";
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

    let colorIcon = "";
    if (isOn) colorIcon = theme.palette.secondary.main
    // else if (!isConnected) colorIcon="#9e9e9e59"


    const handlePressSwitch = () => {
        if(isOn === 1) setIsOn(0);
        else if(isOn === 0) setIsOn(1);
    }

    return (
        <Card className={classes.root}>
            <SwitchCardOptions sensorId={sensor.sensor_id} deviceId={sensor.device_id}/>
            <ButtonBase className={classes.cardAction} onClick={handlePressSwitch}>
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
