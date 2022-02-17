import * as React from 'react';

import {makeStyles} from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Icon from "@material-ui/core/Icon";
import Card from "@material-ui/core/Card";


const useStyles = makeStyles({
    root: {
        display: 'flex',
        justifyContent: 'center'
    },
    card: {
        maxWidth: 550,
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

    const estate = {voltage: 225.8, current: 0.035, power: 0.5, energy: 0.007, frequency: 50, pf: 0.06};

    return (
        <div className={classes.root}>
            <Card className={classes.card}>
                <Icon className={classes.icon}>bolt</Icon>
                <div className={classes.valuesCard}>
                    <div>
                        <Typography gutterBottom variant="button" component="span" style={{marginRight:6}}>
                            Voltage:
                        </Typography>
                        <Typography gutterBottom variant="body1" component="span">
                            {estate.voltage} V
                        </Typography>
                    </div>
                    <div>
                        <Typography gutterBottom variant="button" component="span" style={{marginRight:6}}>
                            Current:
                        </Typography>
                        <Typography gutterBottom variant="body1" component="span">
                            {estate.current} A
                        </Typography>
                    </div>
                    <div>
                        <Typography gutterBottom variant="button" component="span" style={{marginRight:6}}>
                            Power:
                        </Typography>
                        <Typography gutterBottom variant="body1" component="span">
                            {estate.power} w
                        </Typography>
                    </div>
                    <div style={{marginBottom: 10}}>
                        <Typography gutterBottom variant="button" component="span" style={{marginRight:6}}>
                            Energy:
                        </Typography>
                        <Typography gutterBottom variant="body1" component="span">
                            {estate.energy} kWh
                        </Typography>
                    </div>
                </div>
            </Card>
        </div>

    );

}

export default EnergyCard;



