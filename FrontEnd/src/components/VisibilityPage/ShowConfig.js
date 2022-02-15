import React, {useEffect, useState} from 'react';
import {makeStyles} from '@material-ui/core/styles';

import Select from '@material-ui/core/Select';
import Accordion from '@material-ui/core/Accordion';
import InputLabel from '@material-ui/core/InputLabel';
import AccordionDetails from '@material-ui/core/AccordionDetails';

import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import MenuItem from '@material-ui/core/MenuItem';
import Typography from '@material-ui/core/Typography';
import FormControl from '@material-ui/core/FormControl';
import Skeleton from "@material-ui/lab/Skeleton";
import AccordionSummary from '@material-ui/core/AccordionSummary';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

import ShowCard from "./ShowCard";
import {logout} from "../../services/auth.service"
import {getSensorsShowGroupBy} from '../../services/petitions.service'


const useStyles = makeStyles((theme) => ({
    formControl: {
        margin: theme.spacing(1),
        minWidth: 120,
    },
    searchSelect:{
        display: 'flex',
        flexDirection: 'row-reverse'
    },
    accordionTitle: {
        flexGrow: 1
    },
}));


const ShowConfig = () => {
    const classes = useStyles();

    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [groupBy, setGroupBy] = useState('room');
    const [isLoaded, setIsLoad] = useState(false);
    const [expanded, setExpanded] = React.useState(false);

    const handleChangeExpanded = (panel) => (event, isExpanded) => {
        setExpanded(isExpanded ? panel : false);
    };
    const handleChangeGroup = (event) => {
        setExpanded(false);
        setGroupBy(event.target.value);
    };

    useEffect(()=>{
        console.log("useEffect for getSensorsByRoom")
        setExpanded(false);

        getSensorsShowGroupBy(groupBy)
            .then(async response => {
                console.log(response.data)
                setData(response.data);
            }).catch(error => {
            if (error.response) {
                if (error.response.status === 401) logout();
                else if (error.response.status === 402) setError(error.response.data);
                else if (error.response.status === 403) setError(error.response.data);
            }else{
                setError(error.message);
            }
        }).finally(() => {
            setIsLoad(true)
        });

    },[groupBy]);


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
                                <ShowCard sensor={sensor} showRoom={showRoom}/>
                            </Grid>
                        )}
                    </Grid>
                }
            </>
        )
    }

    if (error !==''){
        return(
            <Box bgcolor="background.darker" boxShadow={2} borderRadius="20px" style={{padding: '30px 1vw 50px 1vw', marginTop: '3vh', }}>
                <Typography variant="h4" gutterBottom align={"center"}>
                    Error
                </Typography>
                <Typography variant="body1" gutterBottom align={"center"}>
                    {error}
                </Typography>
            </Box>
        )
    }else{
        return (
                <Box bgcolor="background.darker" boxShadow={2} borderRadius="20px" style={{padding: '30px 1vw 50px 1vw', marginTop: '3vh', }}>
                    <Typography variant="h4" gutterBottom align={"center"}>
                        Visibility
                    </Typography>
                    <div className={classes.searchSelect}>
                        <FormControl className={classes.formControl}>
                            <InputLabel id="order-select-label">Order</InputLabel>
                            <Select
                                labelId="order-select-label"
                                id="order-select"
                                value={groupBy}
                                onChange={handleChangeGroup}
                            >
                                <MenuItem value={'room'}>Room</MenuItem>
                                <MenuItem value={'type'}>Type</MenuItem>
                                <MenuItem value={'device_id'}>Device</MenuItem>
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

}

export default ShowConfig;

