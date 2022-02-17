import {useEffect, useRef, useState} from 'react';

import { makeStyles } from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import Typography from '@material-ui/core/Typography';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';

import CamCard from "./Cards/CamCard";
import ChartCard from "./Cards/ChartCard";
import SwitchCard from "./Cards/SwitchCard";
import PassiverestCard from "./Cards/PassiverestCard";

import {logout} from "../../services/auth.service"

import {getSensorsValuesGroupBy} from '../../services/petitions.service'
import {useHistory} from "react-router-dom";
import Skeleton from "@material-ui/lab/Skeleton";
import EnergyCard from "./Cards/EnergyCard";

import StackGrid from "react-stack-grid";



const useStyles = makeStyles((theme) => ({
    boxGroups: {
        padding: '30px 1vw 50px 1vw',
        marginTop: '15px'
    },
    gridRooms: {
        width:'100%',
        marginTop: 17,
        margin: 0
    },
    gridSensors: {
        width:'100%',
        maxWidth: 666,
        marginTop: 17,
        margin: 0
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 120,
    },
    searchSelect:{
        display: 'flex',
        flexDirection: 'row-reverse'
    }
}));


const ListDevices = () => {
    const classes = useStyles();
    const history = useHistory();

    const [data, setData] = useState({});
    const [groupBy, setGroupBy] = useState('room');
    const [isLoaded, setIsLoad] = useState(false);

    const [width, setWidth] = useState(window.innerWidth)
    const [gridd, setGridd] = useState(useRef(null));

    const handleChangeOrder = (event) => {setGroupBy(event.target.value);};
    const goError = (errorType, errorMessage) => history.push({pathname: 'error', state: {errorType:errorType, errorMessage:errorMessage}});

    useEffect(() => {
        if(gridd.current !== null){
            setTimeout(function() {gridd.updateLayout();}.bind(this), 1000)
        }
    }, [gridd, data]);

    useEffect(() => {
        function handleResize() {
            setWidth(window.innerWidth);
        }

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(()=>{
        getSensorsValuesGroupBy(groupBy)
            .then(async response => {
                const a = Object.keys(response.data).sort().reverse().reduce((r, k) => (r[k] = response.data[k], r), {})
                setData(a);
            }).catch(error => {
                if (error.response) {
                    if (error.response.status === 401) logout()
                    else if (error.response.status === 402) goError(error.message, error.response.data);
                    else if (error.response.status === 403) goError(error.message, error.response.data);
                }
                else if(error.message === 'Network Error'){
                    goError(error.message,
                        [
                            '-El servidor esta aturat',
                            '-El Dispositiu no confia amb el certificat del servidor.',
                            'Si es tracta del segon cas accedeix a '+process.env.REACT_APP_API_ENDPOINT+"/api/test"
                        ]
                    );
                }else{
                    goError(error.message, "");
                }

            }).finally(() => {
                setIsLoad(true)
            });
    },[groupBy]);

    const renderGroups = () => {
        return Object.entries(data).map(([room,sensors]) => {
            return (
                <Grid item key={room} >
                    <Box className={classes.boxGroups} key={room} bgcolor="background.darker" boxShadow={2} borderRadius="20px">
                        <Typography variant="h4" gutterBottom align={"center"}>
                            {room}
                        </Typography>
                        {renderSensors(sensors)}
                        {room === 'Bedroom' && <EnergyCard/>}
                    </Box>
                </Grid>
            )
        })

    }
    const renderSensors = (sensors) => {
        const actuators = sensors.filter(sensor => sensor.type==="actuator")
        const passive = sensors.filter(sensor => sensor.type==="passive")
        const actives = sensors.filter(sensor => sensor.type==="active")
        const cameras = sensors.filter(sensor => sensor.type==="camera")
        const showRoom = groupBy !== 'room';
        return(
            <>
                <Grid className={classes.gridSensors} container direction="row" justify="center" alignItems="stretch" spacing={2}>

                {actuators.length !== 0 &&
                    [actuators.map((sensor) =>
                        <Grid item key={sensor.sensor_id} xs={'auto'}>
                            <SwitchCard sensor={sensor} showRoom={showRoom}/>
                        </Grid>
                    ),
                        <Grid xs={12}/>
                    ]
                }
                {passive.length !== 0 &&
                    [passive.map((sensor) =>
                        <Grid item key={sensor.sensor_id} xs={'auto'}>
                            <PassiverestCard sensor={sensor} showRoom={showRoom}/>
                        </Grid>
                    ),
                        <Grid xs={12}/>
                    ]
                }
                {actives.length !== 0 &&
                    [actives.map((sensor) =>
                        <Grid item key={sensor.sensor_id} xs={'auto'}>
                            <ChartCard sensor={sensor} showRoom={showRoom}/>
                        </Grid>
                    ),
                    <Grid xs={12}/>
                    ]
                }
                {cameras.length !== 0 &&
                    [cameras.map((sensor) =>
                        <Grid item key={sensor.sensor_id} xs={'auto'}>
                            <CamCard sensor={sensor} showRoom={showRoom}/>
                        </Grid>
                    ),
                        <Grid xs={12}/>
                    ]
                }
                </Grid>

            </>
        )
    }


    return (
        <>
            <div className={classes.searchSelect}>
                <FormControl className={classes.formControl}>
                    <InputLabel id="order-select-label">Group By</InputLabel>
                    <Select
                        labelId="order-select-label"
                        id="order-select"
                        value={groupBy}
                        onChange={handleChangeOrder}
                    >
                        <MenuItem value={'room'}>Room</MenuItem>
                        <MenuItem value={'type'}>Type</MenuItem>
                        <MenuItem value={'device_id'}>device</MenuItem>
                    </Select>
                </FormControl>
            </div>

            {isLoaded?
                <StackGrid
                    columnWidth={width <= 666 ? '100%' : 666}
                    className={classes.gridRooms}
                    gutterWidth={15}
                    gridRef={grid => setGridd(grid)}
                >
                    {renderGroups()}
                </StackGrid>
                :
                <Box className={classes.boxGroups} bgcolor="background.darker" boxShadow={2} borderRadius="20px" >
                    <Grid className={classes.gridSensors} container justify="center">
                        <Skeleton height={50} width={'60%'}/>
                        <Skeleton height={150} width={'80%'}/>
                        <Skeleton height={100} width={'80%'}/>
                        <Skeleton height={100} width={'80%'}/>
                    </Grid>
                </Box>
            }

        </>
    )


}

export default ListDevices;

