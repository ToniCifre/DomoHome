import React from 'react';

import { makeStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';

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
    let image;
    if(sensor.sensor_id==='c1'){
        image = process.env.PUBLIC_URL + '/livingroom.jpg';
    } else if(sensor.sensor_id==='c3'){
        image = process.env.PUBLIC_URL + '/room.jpg';
    } else{
        image = process.env.PUBLIC_URL + '/camoff.jpeg';
    }

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
