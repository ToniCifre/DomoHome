import React, {useContext, useEffect, useRef, useState} from 'react';

import { makeStyles } from '@material-ui/core/styles';
import Typography from "@material-ui/core/Typography";
import Container from "@material-ui/core/Container";
import MenuItem from '@material-ui/core/MenuItem';

import Box from "@material-ui/core/Box";
import Button from '@material-ui/core/Button';
import Slider from "@material-ui/core/Slider";
import FormControl from '@material-ui/core/FormControl';

import Select from '@material-ui/core/Select';
import Checkbox from '@material-ui/core/Checkbox';
import TextField from '@material-ui/core/TextField';
import InputLabel from '@material-ui/core/InputLabel';
import FormControlLabel from '@material-ui/core/FormControlLabel';


import ChooseDialog from "../components/ChooseDialog";
import SocketContext from "../SocketContext";

import {getRooms, getDefinitions, addDevice, serialize} from '../services/petitions.service'
import Loader from "../components/Loading";
import {useSnackbar} from "notistack";

const useStyles = makeStyles((theme) => ({
    form: {
        '& .MuiTextField-root': {
            margin: theme.spacing(1),
            width: 200,
        },
        marginTop: "20px",
    },
    box:{
        alignContent: "center",
        width: "fit-content",
        paddingBottom: 30,
        margin: "10px auto auto",
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 140,
    },
    buttonDiv: {
        textAlign: 'center'
    },
    hide:{display: "none"}
}));

const NewDevice = props  => {
    const classes = useStyles();
    const { enqueueSnackbar } = useSnackbar();

    const form = useRef(null)

    const [error, setError] = useState(null);

    const [rooms, setRooms] = useState([]);
    const [isLoadedRooms, setIsLoadedRooms] = useState(false);
    const [definitionsActive, setDefinitionActive] = useState([]);
    const [isLoadedDefinitionsActive, setIsLoadedDefinitionsActive] = useState(false);
    const [definitionsActuator, setDefinitionActuator] = useState([]);
    const [isLoadedDefinitionsActuator, setIsLoadedDefinitionsActuator] = useState(false);
    const [definitionsPassive, setDefinitionPassive] = useState([]);
    const [isLoadedDefinitionsPassive, setIsLoadedDefinitionsPassive] = useState(false);

    const [openDialog, setOpenDialog] = React.useState(false);

    const socket = useContext(SocketContext)

    let device = ""
    let sensors = ""
    try {
        device = props.location.state.device
        sensors = props.location.state.sensors
    } catch (err) {
        window.location.href = '/';
    }

    useEffect(() => {
        const types = Object.values(sensors)
        console.log(types)

        getRooms()
            .then(async response => {
                console.log(response.data)
                setRooms(response.data)
            }).catch(error => {
                if (error.response){
                    setError(error.response.data)
                }else{
                    console.error('There was an error!', error);
                    setError(error)
                }
            }).finally(() => setIsLoadedRooms(true));

        if (types.includes('active')){
            getDefinitions('active')
                .then(async response => {
                    console.log(response.data)
                    setDefinitionActive(response.data)
                }).catch(error => {
                if (error.response){
                    setError(error.response.data)
                }else{
                    setError(error)
                }
            }).finally(() => setIsLoadedDefinitionsActive(true));
        }else setIsLoadedDefinitionsActive(true)

        if (types.includes('actuator')){
            getDefinitions('actuator')
                .then(async response => {
                    console.log(response.data)
                    setDefinitionActuator(response.data)
                }).catch(error => {
                if (error.response){
                    setError(error.response.data)
                }else{
                    console.error('There was an error!', error);
                    setError(error)
                }
            }).finally(() => setIsLoadedDefinitionsActuator(true));
        }else setIsLoadedDefinitionsActuator(true)

        if (types.includes('passive')){
            getDefinitions('passive')
                .then(async response => {
                    console.log(response.data)
                    setDefinitionPassive(response.data)
                }).catch(error => {
                if (error.response){
                    setError(error.response.data)
                }else{
                    console.error('There was an error!', error);
                    setError(error)
                }
            }).finally(() => setIsLoadedDefinitionsPassive(true));
        }else setIsLoadedDefinitionsPassive(true)

    },[]);


    const submit = e => {
        e.preventDefault()
        const data = serialize(e.target);
        setIsLoadedRooms(false)
        addDevice(data)
            .then(response => {
                console.log(response)
                if (response.status === 200) {
                    window.location.href = '/';
                }
                return response.data
            })
            .catch(error => {
                if(error.response) enqueueSnackbar(error.response.data, {variant: 'error',})
                else enqueueSnackbar(error, {variant: 'error',})

            })
            .finally(() => setIsLoadedRooms(true));
    }

    const handleOpenDialog = () => { setOpenDialog(true);};
    const handleCancelDialog = () => { setOpenDialog(false);    };

    const handleResetDevice = () => {
        socket.emit('reset', device+'/reset');
        setOpenDialog(false);
        window.location.href = '/';
    };

    if (error){
        return (
            <Container maxWidth={"lg"} style={{marginTop: 25, marginBottom: 25,}}>
                <Typography variant="h3" gutterBottom align={"center"}>
                    {error}
                </Typography>
            </Container>
        );
    }else{
        return (
            <Container maxWidth={"lg"} style={{marginTop: 25, marginBottom: 25,}}>
                <Loader center size={150} open={!(isLoadedRooms && isLoadedDefinitionsActive && isLoadedDefinitionsActuator && isLoadedDefinitionsPassive)}/>

                <Typography variant="h3" gutterBottom align={"center"}>
                    Add Device
                </Typography>

                <form className={classes.form} ref={form} onSubmit={submit}>
                    <input name="device" defaultValue={device} className={classes.hide}/>
                    <input name="nsensors" defaultValue={Object.keys(sensors).length} className={classes.hide}/>

                    <Typography required variant="h5" gutterBottom align={"center"}>{device}</Typography>

                    {Object.entries(sensors).map( ([sensor, type], id) =>
                        <Box className={classes.box} key={id} bgcolor="background.darker" boxShadow={2} borderRadius="20px" p={[0,2]}>
                            <input name={"sensor_"+id} defaultValue={sensor} className={classes.hide}/>
                            <input name={"type_"+id} defaultValue={type} className={classes.hide}/>

                            <Typography variant="h6" gutterBottom align={"center"}>{sensor}</Typography>
                            <TextField required name={"name_"+id} label="Name" helperText="Incorrect entry."/>

                            <FormControl className={classes.formControl}>
                                <InputLabel htmlFor={"room_"+id} >rooms</InputLabel>
                                <Select defaultValue="" id={"room_"+id} name={"room_"+id} required>
                                    {rooms.map((room) =>
                                        <MenuItem key={room} value={room}>{room}</MenuItem>
                                    )}
                                </Select>
                            </FormControl>

                            {(type === "actuator" || type === "active" || type === "passive") &&
                            <FormControl className={classes.formControl}>
                                <InputLabel htmlFor={"definition_"+id}>type</InputLabel>
                                <Select defaultValue="" id={"definition_"+id} name={"definition_"+id}>
                                    {type === "active" &&
                                        definitionsActive.map((definition) =>
                                            <MenuItem key={definition.definition} value={definition.definition}>
                                                <span className="material-icons"
                                                      style={{fontSize: 15, marginRight: 8}}>{definition.icon}</span>
                                                {definition.definition}
                                            </MenuItem>
                                        )
                                    }
                                    {type === "actuator" &&
                                        definitionsActuator.map((definition) =>
                                            <MenuItem key={definition.definition} value={definition.definition}>
                                                <span className="material-icons" style={{ fontSize:15, marginRight:8 }}>{definition.icon}</span>
                                                {definition.definition}
                                            </MenuItem>
                                        )
                                    }
                                    {type === "passive" &&
                                        definitionsPassive.map((definition) =>
                                            <MenuItem key={definition.definition} value={definition.definition}>
                                                <span className="material-icons" style={{ fontSize:15, marginRight:8 }}>{definition.icon}</span>
                                                {definition.definition}
                                            </MenuItem>
                                        )
                                    }

                                </Select>
                            </FormControl>
                            }
                            <FormControlLabel
                                className={classes.formControl}
                                style={{paddingTop:10}}
                                control={<Checkbox color="primary" name={'show_'+id} value={1}/>}
                                label="Show in home"
                            />
                            {type === "passive" &&
                            <FormControl className={classes.formControl}>
                                <TextField required name={"change_period_"+id} label="Change period" helperText="Time in seconds without detect motion to switch status."/>
                                {/*<Typography variant="caption" display="block" gutterBottom>*/}
                                {/*    */}
                                {/*</Typography>*/}
                            </FormControl>
                            }
                            {type === "active" &&
                            <>
                                <FormControl className={classes.formControl}>
                                    <Typography id="discrete-slider" gutterBottom>
                                        save period
                                    </Typography>
                                    <Slider
                                        defaultValue={30} aria-labelledby="discrete-slider"
                                        valueLabelDisplay="auto" step={5} marks min={5} max={120} name={"save_period_"+id}
                                    />
                                    <Typography variant="caption" display="block" gutterBottom>
                                        Save in DB in min.
                                    </Typography>
                                </FormControl>
                                <FormControl className={classes.formControl}>
                                    <Typography id="discrete-slider" gutterBottom>
                                        take period
                                    </Typography>
                                    <Slider
                                        defaultValue={30} aria-labelledby="discrete-slider"
                                        valueLabelDisplay="auto" step={1} marks min={0} max={60} name={"take_period_"+id}
                                    />
                                    <Typography variant="caption" display="block" gutterBottom>
                                        Update value in seconds.
                                    </Typography>
                                </FormControl>
                            </>

                            }
                            {type === "camera" &&
                            <>
                                <FormControl className={classes.formControl}>
                                    <Typography id="discrete-slider" gutterBottom>
                                        Frame rate
                                    </Typography>
                                    <Slider name={"framerate_"+id} min={1} max={30} step={1} defaultValue={[1, 15]}
                                            valueLabelDisplay="auto" aria-labelledby="range-slider"
                                    />
                                    <Typography variant="caption" display="block" gutterBottom>
                                        Min normal mode, Max film mode.
                                    </Typography>
                                </FormControl>
                                <FormControlLabel
                                    className={classes.formControl}
                                    style={{paddingTop:10}}
                                    control={<Checkbox color="primary" name={'film_'+id} value={1}/>}
                                    label="Film"
                                    labelPlacement="start"
                                />
                            </>
                            }
                        </Box>
                    )}
                <div className={classes.buttonDiv}>
                    <Button type="submit" variant="contained" color="primary" style={{marginTop:20}}>
                        Submit
                    </Button>
                </div>

                </form>

                <div className={classes.buttonDiv}>
                    <Button onClick={handleOpenDialog} color="default" style={{marginTop:20, color:'#949494'}}>
                        Reset Device
                    </Button>
                </div>

                <ChooseDialog isOpen={openDialog} handleCancel={handleCancelDialog} handleAgree={handleResetDevice} title={'Restableix el dispositio'} >
                    <p>
                        Un cop restablit el dispositiu, esperi 20 segons i reiniciel.
                    </p>
                </ChooseDialog>
            </Container>
        );
    }
}


export default NewDevice
