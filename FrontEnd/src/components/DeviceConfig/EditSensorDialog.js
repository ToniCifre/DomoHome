import React, {useRef, useState} from 'react';

import {useSnackbar} from "notistack";
import {makeStyles} from "@material-ui/core/styles";

import Slider from "@material-ui/core/Slider";
import Button from '@material-ui/core/Button';
import MenuItem from "@material-ui/core/MenuItem";
import Typography from "@material-ui/core/Typography";
import FormControl from "@material-ui/core/FormControl";

import Dialog from '@material-ui/core/Dialog';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import Select from "@material-ui/core/Select";
import Checkbox from "@material-ui/core/Checkbox";
import TextField from "@material-ui/core/TextField";
import InputLabel from "@material-ui/core/InputLabel";
import FormControlLabel from "@material-ui/core/FormControlLabel";

import Loader from "../Loading";
import {updateSensor, serialize} from "../../services/petitions.service";


const useStyles = makeStyles((theme) => ({
    form: {
        '& .MuiTextField-root': {
            margin: theme.spacing(1),
            width: 200,
        },
        marginTop: "6vh",
    },
    box:{
        alignContent: "center",
        width: "fit-content",
        paddingBottom: 30,
        margin: "3vh auto auto",
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 140,
    },
    hide:{display: "none"}
}));

export default function EditSensorDialog({isOpen, handleAccept, handleCancel, title, sensor, rooms, definitions}) {
    const classes = useStyles();
    const form = useRef(null)
    const { enqueueSnackbar } = useSnackbar();

    const [isLoaded, setIsLoaded] = useState(true);

    const submit = e => {
        e.preventDefault()
        const data = serialize(e.target);
        console.log(data)
        setIsLoaded(false)
        updateSensor(sensor.type, sensor.sensor_id, data)
            .catch(error => {
                if (error.response) {
                    enqueueSnackbar(error.response.data, {variant: 'error'})
                }else{
                    enqueueSnackbar(error.message, {variant: 'error'})
                }
            }).finally(() => {
                setIsLoaded(true)
                handleAccept()
                handleCancel()
            });
    }

    if (!sensor){return (<></>)}
    return (
        <Dialog
            open={isOpen}
            onClose={handleCancel}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
        >
            <DialogTitle id="alert-dialog-title">{title}</DialogTitle>
            <DialogContent>
                <Typography variant="h6" gutterBottom align={"left"}>{sensor.sensor_id}</Typography>

                <form className={classes.form} ref={form} onSubmit={submit}>
                    <TextField required name={"name"} label="Name" defaultValue={sensor.name} helperText="Incorrect entry."/>

                    <FormControl className={classes.formControl}>
                        <InputLabel htmlFor={"room"} >rooms</InputLabel>
                        <Select defaultValue={sensor.room} id={"room"} name={"room"} required>
                            {rooms.map((room) =>
                                <MenuItem key={room} value={room}>{room}</MenuItem>
                            )}
                        </Select>
                    </FormControl>

                    {(sensor.type === "actuator" || sensor.type === "active" || sensor.type === "passive") &&
                    <FormControl className={classes.formControl}>
                        <InputLabel htmlFor={"definition"}>type</InputLabel>
                        <Select defaultValue={sensor.definition} id={"definition"} name={"definition"}>
                            {definitions.map((definition) =>
                                <MenuItem key={definition.definition} value={definition.definition}>
                                    <span className="material-icons" style={{ fontSize:15, marginRight:8 }}>{definition.icon}</span>
                                    {definition.definition}
                                </MenuItem>
                            )}

                        </Select>
                    </FormControl>
                    }
                    {sensor.type === "passive" &&
                    <FormControl className={classes.formControl}>
                        <TextField required defaultValue={sensor.change_period} name={"change_period"}
                                   label="Change period" type={'number'} helperText="Time in seconds without detect motion to switch status."/>
                        {/*<Typography variant="caption" display="block" gutterBottom>*/}
                        {/*    */}
                        {/*</Typography>*/}
                    </FormControl>
                    }
                    {sensor.type === "active" &&
                    <>
                        <FormControl className={classes.formControl}>
                            <Typography id="save_period" gutterBottom>
                                save period
                            </Typography>
                            <Slider
                                defaultValue={sensor.save_period} aria-labelledby="save_period"
                                valueLabelDisplay="auto" step={5} marks min={5} max={120} name={"save_period"}
                            />
                            <Typography variant="caption" display="block" gutterBottom>
                                Save in DB in min.
                            </Typography>
                        </FormControl>
                        <FormControl className={classes.formControl}>
                            <Typography id="take_period" gutterBottom>
                                take period
                            </Typography>
                            <Slider
                                defaultValue={sensor.take_period} aria-labelledby="take_period"
                                valueLabelDisplay="auto" step={1} marks min={0} max={60} name={"take_period"}
                            />
                            <Typography variant="caption" display="block" gutterBottom>
                                Update value in seconds.
                            </Typography>
                        </FormControl>
                    </>

                    }
                    {sensor.type === "camera" &&
                    <>
                        <FormControl className={classes.formControl}>
                            <Typography id="framerate" gutterBottom>
                                Frame rate
                            </Typography>
                            <Slider name={"framerate"} min={1} max={30} step={1}
                                    defaultValue={[sensor.min_framerate, sensor.max_framerate]}
                                    valueLabelDisplay="auto" aria-labelledby="framerate"
                            />
                            <Typography variant="caption" display="block" gutterBottom>
                                Min normal mode, Max film mode.
                            </Typography>
                        </FormControl>
                        <FormControlLabel
                            className={classes.formControl}
                            style={{paddingTop:10}}
                            control={<Checkbox color="primary" name={'film'} defaultChecked={sensor.film === 1} value={1}/>}
                            label="Film"
                            labelPlacement="start"
                        />
                    </>
                    }

                    <DialogActions>
                        <Button onClick={handleCancel} color="default" style={{marginTop:20}}>
                            Close
                        </Button>
                        <Button type="submit" color="primary" style={{marginTop:20}}>
                            Submit
                        </Button>
                    </DialogActions>
                </form>
            </DialogContent>
            <Loader center size={150} open={!isLoaded}/>
        </Dialog>
    );
}
