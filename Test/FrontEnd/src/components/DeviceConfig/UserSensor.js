import React, {useEffect, useState} from 'react';

import {makeStyles} from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import Typography from '@material-ui/core/Typography';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import Accordion from '@material-ui/core/Accordion';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

import UserSensorCard from "./UserSensorCard";
import AuthService from "../../services/auth.service"
import {getUsersNames ,getUserSensorsGroupBy} from '../../services/petitions.service'
import Skeleton from "@material-ui/lab/Skeleton";


const useStyles = makeStyles((theme) => ({
    formControl: {
        margin: theme.spacing(1),
        minWidth: 120,
    },
    searchSelect:{
        display: 'flex',
        flexDirection: 'row-reverse',
        flexWrap: 'wrap-reverse'
    },
    accordionTitle: {
        flexGrow: 1
    },
}));


const UserSensor = () => {
    const classes = useStyles();

    const [data, setData] = useState(null);
    const [users, setUsers] = useState([]);
    const [user, setUser] = useState(AuthService.getCurrentUser().user);
    const [error, setError] = useState('');
    const [groupBy, setGroupBy] = useState('room');
    const [isLoaded, setIsLoad] = useState(0);
    const [expanded, setExpanded] = React.useState(false);

    const handleChangeExpanded = (panel) => (event, isExpanded) => {
        setExpanded(isExpanded ? panel : false);
    };
    const handleChangeGroup = (event) => {
        setExpanded(false);
        setGroupBy(event.target.value);
    };
    const handleChangeUser = (event) => {
        setExpanded(false);
        setUser(event.target.value);
    };

    useEffect(()=>{
        getUsersNames()
            .then(async response => {
                setUsers(response.data);
            })
            .catch(error => {
                if (error.response) {
                    if (error.response.status === 401) AuthService.logout();
                    else if (error.response.status === 402) setError(error.response.data);
                    else if (error.response.status === 403) setError(error.response.data);
                }else{
                    setError(error.message);
                }
            })

    },[]);

    useEffect(()=>{
        getUserSensorsGroupBy(user, groupBy)
            .then(async response => {
                setData(response.data);
            })
            .catch(error => {
                if (error.response) {
                    if (error.response.status === 401) AuthService.logout();
                    else if (error.response.status === 402) setError(error.response.data);
                    else if (error.response.status === 403) setError(error.response.data);
                }else{
                    setError(error.message);
                }
            }).finally(() => {
                setIsLoad(true)
            });

    },[user, groupBy]);


    const renderGroups = () => {
        return Object.entries(data).map(([group,sensors]) => {
            return (
                <Accordion key={group} expanded={expanded === group} square onChange={handleChangeExpanded(group)}>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls={group+"-content"}
                        id={group+"-header"}
                    >
                        <Typography className={classes.accordionTitle} variant="h6">
                            {group}
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        {renderSensors(sensors)}
                    </AccordionDetails>
                </Accordion>
            )
        })

    }
    const renderSensors = (sensors) => {
        const showRoom = groupBy === 'type';
        return(
            <>
                {sensors &&
                    <Grid container direction="row" justify="center" alignItems="stretch" spacing={3} style={{marginTop: 3}}>
                        {sensors.map((sensor) =>
                            <Grid item key={sensor.sensor_id}>
                                <UserSensorCard user={user} sensor={sensor} showRoom={showRoom}/>
                            </Grid>
                        )}
                    </Grid>
                }
            </>
        )
    }

    return (
            <Box bgcolor="background.darker" boxShadow={2} borderRadius="20px" style={{padding: '30px 1vw 50px 1vw', marginTop: '3vh', }}>
                <Typography variant="h5" gutterBottom align={"center"} style={{marginBottom: 35}}>
                    Users Sensors
                </Typography>

                <div className={classes.searchSelect}>
                    <FormControl className={classes.formControl}>
                        <InputLabel id="order-select-label">Group by</InputLabel>
                        <Select
                            labelId="order-select-label"
                            id="order-select"
                            value={groupBy}
                            onChange={handleChangeGroup}
                        >
                            <MenuItem value={'room'}>Room</MenuItem>
                            <MenuItem value={'type'}>Type</MenuItem>
                            <MenuItem value={'device_id'}>device</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl className={classes.formControl}>
                        <InputLabel id="order-select-label">User</InputLabel>
                        <Select
                            labelId="order-select-label"
                            id="order-select"
                            value={user}
                            onChange={handleChangeUser}
                        >
                            {users.map((user) => <MenuItem key={user} value={user}>{user}</MenuItem>)}
                        </Select>
                    </FormControl>
                </div>

                {isLoaded?
                    renderGroups()
                :
                    <>
                        <Skeleton style={{ height: 50 }}/>
                        <Skeleton style={{ height: 50 }}/>
                        <Skeleton style={{ height: 50 }}/>
                    </>
                }
            </Box>

        )
}

export default UserSensor;

