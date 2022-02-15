import * as React from 'react';
import Paper from '@material-ui/core/Paper';

import {
    Chart,
    SplineSeries,
    Title,
    Tooltip,
} from '@devexpress/dx-react-chart-material-ui';
import { EventTracker} from '@devexpress/dx-react-chart';

import {makeStyles} from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';

import SocketContext from "../../../SocketContext";
import {useContext, useEffect, useState} from "react";


const useStyles = makeStyles({
    root: {
        width: '90vw',
        maxWidth: 265
    },
    char: {
        padding: '5px 0px',
        maxHeight: 165
    },
    charPanelInfo: {
        textAlign: 'center',
        width: '100%',
    },
    divTitle: {
        display: 'flex',
        flexWrap:'wrap'
    },
    charTitle: {
        flexGrow: 1
    },
    charSubtitle: {
        color: '#808080',
        position:"absolute",
        paddingLeft: 8
    },
    charIcon: {
        fontSize: '30px !important',
        paddingLeft: 4
    },
    historyIcon: {
        fontSize: '30px !important',
        paddingRight: 4
    },
});

const Text = (props) => {
    const classes = useStyles();
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

            <div style={{textAlign:"left"}}>
                {text.showRoom &&
                <Typography className={classes.charSubtitle} variant="caption" display="block">
                    {text.sensor.room}
                </Typography>
                }
                <Typography variant="subtitle1" align={"center"} style={{padding: "0px 40px"}}>
                    {text.actual_value} {text.sensor.definition}
                </Typography>
            </div>

        </div>
    );
};

const dateToTime=(date)=>{return date.getHours()+":"+('0'+date.getMinutes()).slice(-2)}

const ChartCard = ({sensor, showRoom}) => {
    const classes = useStyles({showRoom});
    if (!sensor.value) sensor.value = []
    const [data, setData] = useState(sensor.value.slice(0));
    const [target, setTarget] = useState(undefined);
    const [actual_value, setActual] = useState(sensor.value.length!==0? sensor.value.at(-1).value : '...');

    const socket = useContext(SocketContext)

    useEffect(()=>{
        console.log("useEffect on Active card "+sensor.sensor_id)

        socket.on(sensor.sensor_id+'/actual', message => {
            setActual(message)
        });
        socket.on(sensor.sensor_id+'/add', message => {
            setData(generateData(message));
            setActual(message)
        });

        return () => {
            socket.off(sensor.sensor_id+'/actual');
            socket.off(sensor.sensor_id+'/add');
        }
    },[socket, sensor.sensor_id]);

    const generateData = (value) => {
        let d = new Date();
        d.setSeconds(0,0);
        if (sensor.value.length > 150 ){
            sensor.value.shift();
        }
        sensor.value.push({value: value, date: d/1000});
        return [...sensor.value];
    };

    const TooltipContent = ({text, targetItem}) => {
        const hora = dateToTime(new Date(data[targetItem.point].date*1000))
        return (
            <>
                <Typography component="h6" variant="h6" align={"center"} style={{padding: "5px 30px 0px 30px"}}>
                    {text} {sensor.definition}
                </Typography>
                <Typography align={"center"} variant="subtitle1" gutterBottom style={{color: '#505050'}}>
                    {hora}
                </Typography>
            </>
        )
    };

    return (
        <Paper className={classes.root}>
            {data &&
                <Chart data={data} className={classes.char}>
                    {/*<ValueAxis />*/}
                    <SplineSeries
                        valueField="value"
                        argumentField="date"
                        // seriesComponent={Line}
                    />

                    {/*<Title text={`${sensor.name};${actual_value} ${sensor.definition};${sensor.icon}`} textComponent={Text}/>*/}
                    <Title text={{sensor, actual_value, showRoom}} textComponent={Text}/>

                    <EventTracker/>
                    <Tooltip targetItem={target} onTargetItemChange={setTarget} contentComponent={TooltipContent}/>
                </Chart>
            }
        </Paper>
    );

}

export default ChartCard;



