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
    divFormConcat:{
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        marginBottom: 15
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 120,
    },
    formConcat: {
        margin: theme.spacing(1),
        minWidth: 120,
    },
    sensorItem:{
        display: 'flex',
        alignItems: 'flex-end'
    }
}));

const TriggerAddTrigger = ({data, pos}) => {
    const classes = useStyles();

    const [triggerType, setTriggerType] = useState(false);

    const renderSensorSelector = () => {
        return (
            <FormControl className={classes.formControl}>
                <InputLabel htmlFor={"trigger-select-"+pos}>Sensor</InputLabel>
                <Select id={"trigger-select-"+pos} name={"trigger-select-"+pos} required>

                    {Object.entries(data).map(([type,sensors], key) =>
                        [
                            <ListSubheader key={key}>{type}</ListSubheader>,

                            sensors.map((sensor) =>
                                <MenuItem key={sensor.sensor_id} value={sensor.sensor_id}
                                          onClick={()=> setTriggerType(sensor.type)}>
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
            [
                <FormControl key={1} className={classes.formControl}>
                    <InputLabel htmlFor={"math-select-"+pos}>When</InputLabel>
                    <Select id={"math-select-"+pos} name={"math-select-"+pos} required>
                        {triggerType &&
                        [
                            triggerType === 'actuator' && [
                                <MenuItem key={1} value={1}>ON</MenuItem>,
                                <MenuItem key={2} value={0}>OFF</MenuItem>
                            ],
                            triggerType === 'active' && [
                                <MenuItem key={3} value={"=="}>{"=="}</MenuItem>,
                                <MenuItem key={4} value={"<"}>{"<"}</MenuItem>,
                                <MenuItem key={5} value={"<="}>{"<="}</MenuItem>,
                                <MenuItem key={6} value={">"}>{">"}</MenuItem>,
                                <MenuItem key={7} value={">="}>{">="}</MenuItem>,
                            ],
                            (triggerType === 'camera' || triggerType === 'passive') && [
                                <MenuItem key={8} value={1}>Detect Move</MenuItem>,
                                <MenuItem key={9} value={0}>Stop Detect Move</MenuItem>
                            ]
                        ]
                        }
                    </Select>
                </FormControl>,
                triggerType && triggerType === 'active' &&
                <FormControl key={1} className={classes.formControl} style={{width:120}}>
                    <TextField id={"trigger-value-"+pos} name={"trigger-value-"+pos} label="Value" type="number"
                               InputProps={{inputProps: {step: 0.1}}} required/>
                </FormControl>

            ]
        )
    }


    return (
        <div>
            {pos > 0 &&
                <div className={classes.divFormConcat}>
                    <Divider variant={'middle'} style={{margin:'10px auto', flexGrow: 15}}/>
                    <FormControl key={1} className={classes.formConcat}>
                        <InputLabel htmlFor={"trigger-union-"+pos}>AND - OR</InputLabel>
                        <Select id={"trigger-union-"+pos} name={"trigger-union-"+pos} required>
                            <MenuItem value={'and'}>AND</MenuItem>
                            <MenuItem value={'or'}>OR</MenuItem>
                        </Select>
                    </FormControl>
                    <Divider variant={'middle'} style={{margin:'10px auto', flexGrow: 15}}/>
                </div>
            }

                <div className={classes.divFormControl}>
                    {renderSensorSelector()}
                    {renderMathExpresion()}
                </div>
        </div>

    )
}

export default TriggerAddTrigger;

