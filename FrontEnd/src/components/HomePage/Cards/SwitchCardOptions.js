import React, {useContext, useEffect, useState} from 'react';

import { makeStyles } from '@material-ui/core/styles';
import Checkbox from '@material-ui/core/Checkbox';

import MoreVertIcon from '@material-ui/icons/MoreVert';
import FormControlLabel from '@material-ui/core/FormControlLabel';

import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import {IconButton, TextField} from "@material-ui/core";
import ChooseDialog from "../../ChooseDialog";
import Select from "@material-ui/core/Select";
import InputLabel from "@material-ui/core/InputLabel";
import ListSubheader from "@material-ui/core/ListSubheader";
import SocketContext from "../../../SocketContext";
import {addScheduler} from "../../../services/petitions.service"
import {useSnackbar} from "notistack";
import CloseIcon from "@material-ui/icons/Close";

const useStyles = makeStyles({
    IconDiv: {
        position:'relative',
        zIndex:1
    },
    IconOptionButton: {
        position: 'absolute',
        padding:2,
        right: 0
    },
    timer: {
        width:"100%",
    },
    checkboxRepeat  : {
        marginLeft: 0,
        marginRight: 0
    },
    selectValue:{
        width:"100%"
    },
    repeatDiv:{
        display: "flex"
    },
    form:{
        marginTop: 25
    }
});

const SwitchCard = ({deviceId, sensorId})  => {
    const classes = useStyles();
    const { enqueueSnackbar, closeSnackbar } = useSnackbar();

    const [repeat, setRepeat] = useState(true);

    const [timer, setTimer] = useState('00:30');

    const [every, setEvery] = useState('hours');
    const [interval, setInterval] = useState(1);
    const [at, setAt] = useState('00:30');

    const [value, setValue] = useState(0);

    const [openDialog, setOpenDialog] = React.useState(0);
    const [anchorEl, setAnchorEl] = React.useState(null);

    const socket = useContext(SocketContext)


    const handleClickMenu = (event) => {setAnchorEl(event.currentTarget);};
    const handleSelectMenu = (option) => {setOpenDialog(option);setAnchorEl(null)}
    const handleCloseMenu = () => {setAnchorEl(null)}

    const handleAcceptTimer = () => {
        console.log(value)
        console.log(timer);
        socket.emit('timerActuator', {'topic': deviceId+'/'+sensorId+'/timer', 'state': value, 'timer':timer});
        setOpenDialog(0);
        enqueueSnackbar("Timer created.",{
            action: key => (
                <IconButton size="small" aria-label="close" color="inherit"
                            onClick={() => closeSnackbar(key)}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            ),
        })
    }
    const handleAcceptScheduler = () => {
        console.log(sensorId)
        console.log(every)
        console.log(interval)
        console.log(at)
        console.log(value)
        addScheduler(sensorId, every, interval, at, value)
            .then(async response => {
                enqueueSnackbar('Scheduler created',{
                    action: key => (
                        <IconButton size="small" aria-label="close" color="inherit"
                                    onClick={() => closeSnackbar(key)}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    ),
                })
            }).catch(error => {
                if (error.response) enqueueSnackbar(error.response.data, {variant: 'error', action: key => (
                        <IconButton size="small" aria-label="close" color="inherit"
                                    onClick={() => closeSnackbar(key)}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    )})
                else enqueueSnackbar(error.response.data, {variant: 'error', action: key => (
                        <IconButton size="small" aria-label="close" color="inherit"
                                    onClick={() => closeSnackbar(key)}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    )})
            })
        setOpenDialog(0);
    }

    return (
        <div className={classes.IconDiv}>
            <IconButton className={classes.IconOptionButton} onClick={handleClickMenu}
                        aria-label="more" aria-controls="long-menu" aria-haspopup="true">
                <MoreVertIcon />
            </IconButton>

            <Menu anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={handleCloseMenu}>
                <MenuItem onClick={event => handleSelectMenu(1)}>Timer</MenuItem>
                <MenuItem onClick={event => handleSelectMenu(2)}>Scheduler</MenuItem>
            </Menu>

            <ChooseDialog isOpen={openDialog===1} handleCancel={()=>setOpenDialog(0)}
                          handleAgree={handleAcceptTimer} title={'Select Time to switch'} >
                <InputLabel className={classes.form} htmlFor={"timer"}> Hour:Minute </InputLabel>
                <TextField id="time" type="time" value={timer} className={classes.timer}
                           onChange={event => setTimer(event.target.value)} InputLabelProps={{shrink: true,}}
                />
                <InputLabel className={classes.form} htmlFor={"value-select"}>Set to</InputLabel>
                <Select id="value-select" name="value-select" className={classes.selectValue} value={value}
                        onChange={event => setValue(event.target.value)}>
                    <MenuItem value={1}>ON</MenuItem>
                    <MenuItem value={0}>OFF</MenuItem>
                </Select>
            </ChooseDialog>


            <ChooseDialog isOpen={openDialog===2} handleCancel={()=>setOpenDialog(0)}
                          handleAgree={handleAcceptScheduler} title={'Add scheduler to switch'} >

                <FormControlLabel label="Repeat" labelPlacement="start" className={classes.checkboxRepeat}
                    control={
                        <Checkbox checked={repeat} onChange={event => setRepeat(event.target.checked)} color="primary"/>
                    }

                />

                {repeat ?
                    <div>
                        <InputLabel className={classes.form} htmlFor={"value-select-every"}>Every</InputLabel>
                        <div className={classes.repeatDiv}>
                            <TextField value={interval} type="number"
                                       onChange={event => setInterval(event.target.value)}/>
                            <Select id="value-select-every" name="value-select-every" className={classes.selectValue}
                                    value={every} onChange={event => setEvery(event.target.value)}>
                                <MenuItem value={'seconds'}>Seconds</MenuItem>
                                <MenuItem value={'minutes'}>Minutes</MenuItem>
                                <MenuItem value={'hours'}>Hours</MenuItem>
                                <MenuItem value={'days'}>Days</MenuItem>
                                <MenuItem value={'weeks'}>Weeks</MenuItem>
                                <ListSubheader>Specific Days</ListSubheader>
                                <MenuItem value={'monday'}>Monday</MenuItem>
                                <MenuItem value={'tuesday'}>Tuesday</MenuItem>
                                <MenuItem value={'wednesday'}>Wednesday</MenuItem>
                                <MenuItem value={'thursday'}>Thursday</MenuItem>
                                <MenuItem value={'friday'}>Friday</MenuItem>
                                <MenuItem value={'saturday'}>Saturday</MenuItem>
                                <MenuItem value={'sunday'}>Sunday</MenuItem>
                            </Select>
                        </div>

                        {(every!=='seconds' && every!=='minutes' && every!=='weeks')  &&
                        <div>
                            <InputLabel className={classes.form} htmlFor={"at "+(every!=='hours'?'(M:S)':'(H:M)')}>At</InputLabel>
                            <TextField id="time" type="time" value={at} className={classes.timer}
                                       onChange={event => setAt(event.target.value)} InputLabelProps={{shrink: true,}}
                            />
                        </div>
                        }
                    </div>
                    :
                    <div>
                    <InputLabel className={classes.form} htmlFor={"at"}>At</InputLabel>
                    <TextField id="time" type="datetime-local" value={at} className={classes.timer}
                    onChange={event => setAt(event.target.value)} InputLabelProps={{shrink: true,}}
                    />
                    </div>
                }


                <InputLabel className={classes.form} htmlFor={"value-select"}>Set to</InputLabel>
                <Select id="value-select" name="value-select" className={classes.selectValue} value={value}
                        onChange={event => setValue(event.target.value)}>
                    <MenuItem value={1}>ON</MenuItem>
                    <MenuItem value={0}>OFF</MenuItem>
                </Select>

            </ChooseDialog>


        </div>

    );
}

export default SwitchCard
