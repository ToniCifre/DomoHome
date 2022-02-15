import React, {useState} from 'react';

import { makeStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
import Grid from '@material-ui/core/Grid';
import CardContent from '@material-ui/core/CardContent';
import ButtonBase from "@material-ui/core/ButtonBase";
import Typography from "@material-ui/core/Typography";
import {updateSensorsShow} from "../../services/petitions.service";
import {useSnackbar} from "notistack";
import Loader from "../Loading";


const useStyles = makeStyles({
    root: {
        width: 200,
        height:'100%'
    },
    cardAction: {
        width: '100%',
        height: '100%',
        display: "unset"
    },
    container:{
        position:'relative'
    }
});

const ShowCard = ({sensor, showRoom})  => {
    const classes = useStyles();
    const { enqueueSnackbar } = useSnackbar();

    const [status, setStatus] = useState(sensor.show === 1);
    const [isLoading, setLoading] = useState(false);

    let color_icon = "";
    const checkColor = () =>{
        if (status) color_icon = ""
        else color_icon="#9e9e9e59"
    }

    const changeVisibility = (e) => {
        e.preventDefault();
        setLoading(true)
        updateSensorsShow(sensor.sensor_id, (!status)? 1 : 0)
            .then(async response => {
                if (response.data){
                    setStatus(response.data.show === 1)
                }else{
                    enqueueSnackbar('Response dont have data.', {variant: 'error'})
                    console.log(response)
                }
            }).catch(error => {
            if (error.response) {
                enqueueSnackbar(error.response.data, {variant: 'error'})
            }else{
                enqueueSnackbar(error.message, {variant: 'error'})
            }

        }).finally(() => {
            setLoading(false)
        });
        checkColor()
    }

    checkColor()
    return (
        <Card className={classes.root}>
            <div className={classes.container}>
                <ButtonBase className={classes.cardAction} onClick={changeVisibility} disabled={isLoading}>
                    <CardContent style={{padding:5}}>
                        <Grid container spacing={3}>
                            <Grid item xs={5}>
                                <span className="material-icons" style={{color: color_icon, fontSize: 75}}>
                                    {sensor.type !== 'camera' ? sensor.icon : 'videocam'}
                                </span>
                            </Grid>
                            <Grid item xs={7}>
                                <Grid container spacing={3}>
                                    <Grid item xs={showRoom? 6: 12}>
                                        <Typography variant="caption" display="block" style={{color: '#808080'}}>
                                            {sensor.sensor_id}
                                        </Typography>
                                    </Grid>
                                    {showRoom &&
                                        <Grid item xs={6}>
                                            <Typography variant="caption" display="block" style={{color: '#808080'}}>
                                                {showRoom &&sensor.room}
                                            </Typography>
                                        </Grid>
                                    }

                                    <Grid item xs={12}>
                                        <Typography gutterBottom variant="h6" component="h6">
                                            {sensor.name}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </CardContent>
                </ButtonBase>
                <Loader center size={80} open={isLoading}/>
            </div>
        </Card>
    );
}

export default ShowCard
