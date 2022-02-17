import React, {useEffect, useState} from 'react';

import Container from "@material-ui/core/Container";

import UserSensor from "../components/DeviceConfig/UserSensor";
import ActuatorEditTable from "../components/DeviceConfig/ActuatorEditTable";
import ActiveEditTable from "../components/DeviceConfig/ActiveEditTable";
import CameraEditTable from "../components/DeviceConfig/CameraEditTable";
import {getRooms} from "../services/petitions.service";
import Skeleton from "@material-ui/lab/Skeleton";
import {useHistory} from "react-router-dom";
import AuthService from "../services/auth.service";
import PassiveEditTable from "../components/DeviceConfig/PassiveEditTable";


const DeviceConfig = ()  => {
    const history = useHistory();

    const [rooms, setRooms] = useState([]);
    const [isLoadedRoom, setIsLoadedRoom] = useState(false);

    const goError = (errorType, errorMessage) => history.push({pathname: 'error',
        state: {errorType:errorType, errorMessage:errorMessage}});
    useEffect(()=>{
        getRooms()
            .then(async response => { setRooms(response.data)})
            .catch(error => {
                if (error.response){
                    if (error.response.status === 401) AuthService.logout();
                    goError("ERROR", error.response.data)
                }else{
                    goError("ERROR", error.messages)
                }
            }).finally(() => {setIsLoadedRoom(true)});

    },[]);

    return (
        <Container maxWidth={"md"} disableGutters>
            {isLoadedRoom ?
                <>
                    <UserSensor/>
                    <ActuatorEditTable rooms={rooms}/>
                    <PassiveEditTable rooms={rooms}/>
                    <ActiveEditTable rooms={rooms}/>
                    <CameraEditTable rooms={rooms}/>
                </>
                :
                <div style={{display:'flex', flexDirection:'column', alignItems:'center',
                    padding: '30px 1vw 50px 1vw', marginTop: '3vh'}}>
                    <Skeleton variant={'rect'} height={150} width={'80%'}/>
                    <Skeleton style={{ height: 150 }} width={'80%'}/>
                    <Skeleton style={{ height: 150 }} width={'80%'}/>
                </div>
            }

        </Container>
    )
}

export default DeviceConfig;
