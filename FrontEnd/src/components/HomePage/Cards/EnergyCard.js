import * as React from 'react';
import {useContext, useEffect, useState} from "react";

import {makeStyles} from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Icon from "@material-ui/core/Icon";
import Card from "@material-ui/core/Card";

import SocketContext from "../../../SocketContext";



const useStyles = makeStyles({
    root: {
        display: 'flex',
        justifyContent: 'center'
    },
    card: {
        maxWidth: 300,
        height:'100%',
        textAlign: "center",
        padding: 10
    },
    icon:{
        fontSize: '45px !important'
    },
    valuesCard: {
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 10
    }
});

const EnergyCard = ({showRoom}) => {
    const classes = useStyles({showRoom});

    const [estate, setEstate] = useState({voltage: 225.8, current: 0.035, power: 0.5, energy: 0.007, frequency: 50, pf: 0.06});

    const socket = useContext(SocketContext)

    useEffect(()=>{
        console.log("useEffect energy ")

        socket.on('PZEM-4t/value', message => {
            setEstate(message)
        });

        return () => {
            socket.off('PZEM-4t/value');
        }
    },[]);

    return (
        <div className={classes.root}>
            <Card className={classes.card}>
                <Icon className={classes.icon}>bolt</Icon>
                <div className={classes.valuesCard}>
                    <div>
                        <Typography gutterBottom variant="button" component="body1" style={{marginRight:6}}>
                            Voltage:
                        </Typography>
                        <Typography gutterBottom variant="body1" component="body1">
                            {estate.voltage} V
                        </Typography>
                    </div>
                    <div>
                        <Typography gutterBottom variant="button" component="body1" style={{marginRight:6}}>
                            Current:
                        </Typography>
                        <Typography gutterBottom variant="body1" component="body1">
                            {estate.current} A
                        </Typography>
                    </div>
                    <div>
                        <Typography gutterBottom variant="button" component="body1" style={{marginRight:6}}>
                            Power:
                        </Typography>
                        <Typography gutterBottom variant="body1" component="body1">
                            {estate.power} w
                        </Typography>
                    </div>
                    <div style={{marginBottom: 10}}>
                        <Typography gutterBottom variant="button" component="body1" style={{marginRight:6}}>
                            Energy:
                        </Typography>
                        <Typography gutterBottom variant="body1" component="body1">
                            {estate.energy} kWh
                        </Typography>
                    </div>
                </div>
            </Card>
        </div>

    );

}

export default EnergyCard;



