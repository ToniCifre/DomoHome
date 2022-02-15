import React, {useContext, useEffect, useState} from 'react';

import { makeStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';

import CameraSocketContext from "../../../CameraSocketContext";
import CardContent from "@material-ui/core/CardContent";
import Typography from "@material-ui/core/Typography";

const useStyles = makeStyles({
    root: {
        maxWidth: 325,
        padding: '3px 0px 0px 0px'
    },
    img: {
        maxWidth: 265,
        // maxHeight: '100%',
        borderRadius: '5px 5px 0px 0px',
        marginBottom: -6,
        marginTop: 5
    },
    cardIcon:{
        fontSize: 90
    }
});

const CamCard = ({sensor, showRoom})  => {
    const classes = useStyles({showRoom});
    const [image, setImageSRC] = useState(process.env.PUBLIC_URL + '/camoff.jpeg');
    const socket = useContext(CameraSocketContext)
    const imm = new Image();
    imm.src = process.env.PUBLIC_URL + '/camoff.jpeg';

    useEffect(()=>{
        if(socket != null){
            console.log("useEffect on Cam card "+sensor.sensor_id)
            socket.on(sensor.device_id+'/'+sensor.sensor_id+"/frame", (message) => {
                setImageSRC(`data:image/jpeg;base64,${Buffer.from(message).toString('base64')}`);
            });
        }
        return () => {
            if(socket != null) {
                socket.off(sensor.device_id + '/' + sensor.sensor_id + "/frame");
            }
        }
    },[socket, sensor.device_id, sensor.sensor_id]);

    return (
        <Card className={classes.root}>
            <CardContent style={{padding:0}}>
                <Typography variant="h5" component="h5" align={"center"}>
                    {sensor.name}
                </Typography>
                {showRoom &&
                    <Typography variant="caption" display="block" style={{color: '#808080'}} gutterBottom
                                align={"center"}>
                        {sensor.room}
                    </Typography>
                }
                <img className={classes.img} src={image}/>

            </CardContent>
        </Card>
    );
}

export default CamCard
