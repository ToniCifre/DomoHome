import React, {useState} from 'react';
import {makeStyles} from '@material-ui/core/styles';

import Select from '@material-ui/core/Select';
import InputLabel from '@material-ui/core/InputLabel';

import Divider from '@material-ui/core/Divider';
import MenuItem from '@material-ui/core/MenuItem';
import Typography from '@material-ui/core/Typography';
import FormControl from '@material-ui/core/FormControl';
import ListSubheader from '@material-ui/core/ListSubheader';
import TextField from "@material-ui/core/TextField";



const useStyles = makeStyles((theme) => ({
    divFormControl:{
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        alignItems: 'flex-end'
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 120,
    },
    sensorItem:{
        display: 'flex',
        alignItems: 'flex-end'
    }
}));

const TriggerAddAction = ({sensors, pos}) => {
    const classes = useStyles();

    const [triggerSensor, setTriggerSensor] = useState(false);
    const [actionValue, setActionValue] = useState('');

    const renderSensorSelector = () => {
        return (
            <FormControl className={classes.formControl}>
                <InputLabel htmlFor={"action-select-" + pos}>Sensor</InputLabel>
                <Select id={"action-select-" + pos} name={"action-select-" + pos} required>

                    {Object.entries(sensors).map(([type,sensors]) =>
                        [
                            <ListSubheader key={type}>{type}</ListSubheader>,

                            sensors.map((sensor) =>
                                <MenuItem key={sensor.sensor_id} value={sensor.sensor_id}
                                          onClick={()=> setTriggerSensor(sensor)}>
                                    <div className={classes.sensorItem}>
                                        <Typography variant="h6" align={"left"} style={{marginRight: 10}}>
                                            {sensor.sensor_id}
                                        </Typography>
                                        <Typography variant="caption" align={"center"}>
                                            {sensor.name}
                                        </Typography>
                                    </div>
                                </MenuItem>)
                        ]

                    )}
                </Select>
            </FormControl>
        )
    }
    const renderMathExpresion = () => {
        return (
            <div>
                <FormControl className={classes.formControl}>
                    <InputLabel htmlFor={"action-value-" + pos}>Set to</InputLabel>
                    <Select id={"action-value-" + pos} name={"action-value-" + pos}
                            onChange={(e)=> setActionValue(e.target.value)} required>
                        {triggerSensor &&
                        [
                            triggerSensor.type === 'actuator' && [
                                <MenuItem value={1}>ON</MenuItem>,
                                <MenuItem value={0}>OFF</MenuItem>,
                                <MenuItem value={'timer'}>Timer</MenuItem>
                            ],
                            triggerSensor.type === 'camera' &&
                            <MenuItem value={1}>Film</MenuItem>
                        ]
                        }
                    </Select>
                </FormControl>
                {actionValue === 'timer' &&
                    [
                        <FormControl className={classes.formControl}>
                            <TextField id={"action-timer-" + pos} name={"action-timer-" + pos} label="Hour:Minute"
                                       type="time" required/>
                        </FormControl>,
                        <FormControl className={classes.formControl}>
                            <InputLabel htmlFor={"action-timer-value-" + pos}>Set to</InputLabel>
                            <Select id={"action-timer-value-" + pos} name={"action-timer-value-" + pos} className={classes.selectValue}>
                                <MenuItem value={1}>ON</MenuItem>
                                <MenuItem value={0}>OFF</MenuItem>
                            </Select>
                        </FormControl>
                    ]
                }
            </div>
        )
    }

    return (
        <div style={{marginTop: '3vh'}}>
            <div className={classes.divFormControl}>
                {renderSensorSelector('Sensor')}
                {renderMathExpresion()}
            </div>
            <Divider variant={'middle'} style={{margin:'10px auto', width:'65%'}}/>
        </div>

    )
}

export default TriggerAddAction;

