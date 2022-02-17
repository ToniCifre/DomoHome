import * as React from 'react';
import Paper from '@material-ui/core/Paper';

import {
    Chart,
    Title,
    Tooltip,
    AreaSeries,
} from '@devexpress/dx-react-chart-material-ui';
import { EventTracker} from '@devexpress/dx-react-chart';
import { area, curveStep } from 'd3-shape';

import {makeStyles} from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';

import { useState} from "react";


const useStyles = makeStyles({
    root: {
        width: '90vw',
        maxWidth: 170
    },
    char: {
        padding: 0,
        maxHeight: 80,
    },
    charPanelInfo:  props => ({
        paddingBottom: props.showRoom ? 5 : 2,
        textAlign: 'center',
        width: '100%',
    }),
    divTitle: {
        display: 'flex',
        flexWrap:'wrap',
        padding: '5px 0',
        alignItems: 'center'
    },
    charTitle: {
        flexGrow: 1
    },
    divRoom: {
        position: 'absolute',
        paddingLeft: 6,
        marginTop: -12
    },
    charRoom: {
        color: '#808080',
        position:"absolute",
    },
    charGraph:{
        maxHeight: 110,
    },
    charIcon: {
        paddingLeft: 4,
        fontSize: '30px !important'
    },
    historyIcon: {
        paddingRight: 4,
        color: '#757575'
    },
});


const Area = props => (
    <AreaSeries.Path
        {...props}
        path={area()
            .x(({ arg }) => arg)
            .y1(({ val }) => val)
            .y0(({ startVal }) => startVal)
            .curve(curveStep)}
    />
);

const dateToTime=(date)=>{
    return date.getHours()+":"+('0'+date.getMinutes()).slice(-2)
}

const ChartCard = ({sensor, showRoom}) => {
    const classes = useStyles({showRoom});

    if (!sensor.value) sensor.value = []
    const data = sensor.value;
    const [target, setTarget] = useState(undefined);


    const generateTitle = (props) => {
        const { text } = props;
        return (
            <div className={classes.charPanelInfo}>
                <div className={classes.divTitle}>
                <span className={`material-icons ${classes.charIcon}`} >
                    {text.sensor.icon}
                </span>
                    <Typography className={classes.charTitle} component="h3" variant="h5" align={"center"}>
                        {text.sensor.name}
                    </Typography>
                    <span className={`material-icons ${classes.historyIcon}`} >
                    timeline
                </span>
                </div>

                <div className={classes.divRoom}>
                    {text.showRoom &&
                    <Typography className={classes.charRoom} variant="caption" display="block">
                        {text.sensor.room}
                    </Typography>
                    }
                </div>

            </div>
        );
    };

    const TooltipContent = ({text, targetItem}) => {
        const start = dateToTime(new Date(data[targetItem.point].date*1000))
        let end = 'now'
        if (targetItem.point+1 < data.length){
            end = dateToTime(new Date(data[targetItem.point+1].date*1000))
        }
        return (
            <>
                <Typography component="h6" variant="h6" align={"center"} style={{padding: "5px 30px 0px 30px"}}>
                    {text==='1'? 'ON': 'OFF'}
                </Typography>
                <Typography align={"center"} variant="subtitle1" gutterBottom style={{color: '#505050'}}>
                    {start} to {end}
                </Typography>
            </>
        )
    };

    return (
        <Paper className={classes.root}>
            {data &&
                <Chart data={data} className={classes.char} height={100}>
                    <div className={classes.charGraph}>
                        <AreaSeries
                            valueField="value"
                            argumentField="date"
                            seriesComponent={Area}
                        />

                    </div>

                    <Title text={{sensor, showRoom}} textComponent={generateTitle}/>

                    <EventTracker/>
                    <Tooltip targetItem={target} onTargetItemChange={setTarget} contentComponent={TooltipContent}/>
                </Chart>
            }
        </Paper>
    );

}

export default ChartCard;



