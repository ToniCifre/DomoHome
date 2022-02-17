import React, {useEffect, useState} from 'react';

import Box from "@material-ui/core/Box";
import EditIcon from '@material-ui/icons/Edit';
import IconButton from '@material-ui/core/IconButton';
import Typography from "@material-ui/core/Typography";
import { DataGrid, GridToolbar} from '@material-ui/data-grid';

import AuthService from "../../services/auth.service";
import EditSensorDialog from "./EditSensorDialog";
import {deleteSensor, getActuatorsInfo, getDefinitions} from "../../services/petitions.service";
import Skeleton from "@material-ui/lab/Skeleton";
import DeleteIcon from "@material-ui/icons/Delete";
import ChooseDialog from "../ChooseDialog";
import {useSnackbar} from "notistack";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import CloseIcon from "@material-ui/icons/Close";

export default function ActuatorEditTable({rooms}) {
    const { enqueueSnackbar, closeSnackbar } = useSnackbar();

    const [data, setData] = useState([]);
    const [editSensor, setEditSensor] = useState(null);
    const [definitions, setDefinitions] = useState([]);

    const [openDialog, setOpenDialog] = React.useState(false);
    const [removeSensor, setRemoveSensor] = React.useState(undefined);
    const [openRemoveDialog, setOpenRemoveDialog] = React.useState(false);
    const [isLoadedData, setIsLoadedData] = useState(false);
    const [isLoadedDef, setIsLoadedDef] = useState(false);

    const columns = [
        {field: 'edit',headerName: 'Edit',minWidth: 50,
            renderCell: (params: GridCellParams) => (
                <ButtonGroup variant="text" aria-label="small primary button group">
                    <IconButton aria-label="delete" color="default"
                                onClick={()=>{
                                    setEditSensor(params.row)
                                    setOpenDialog(true);
                                }} >
                        <EditIcon  fontSize="small"/>
                    </IconButton>
                    <IconButton aria-label="delete" color="default"
                                onClick={()=> {
                                    setRemoveSensor(params.row.sensor_id)
                                    setOpenRemoveDialog(true)
                                }} >
                        <DeleteIcon fontSize="small"/>
                    </IconButton>
                </ButtonGroup>
            ),
        },
        {field: 'sensor_id',headerName: 'ID', minWidth: 95},
        {field: 'name',headerName: 'Display Name',minWidth: 150,flex: 1,},
        {field: 'room',headerName: 'Room',minWidth: 115},
        {field: 'definition',headerName: 'Definition',minWidth: 120},

    ];

    const handleCancelDialog = () => {setOpenDialog(false);};
    const handleCancelRemoveDialog = () => {setOpenRemoveDialog(false);setRemoveSensor(undefined)};

    const handleAgreeRemoveDialog = () => {
        if(removeSensor){
            deleteSensor(removeSensor)
                .then(response => {
                    enqueueSnackbar('Sensor Removed.')
                }).catch(error => {
                    if (error.response){
                        if (error.response.status === 401) AuthService.logout();
                        console.log(error.response.data)
                    }
                    enqueueSnackbar("Error removing actuator.", {variant: 'error',
                        action: key => (
                            <IconButton size="small" aria-label="close" color="inherit"
                                        onClick={() => closeSnackbar(key)}>
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        )})
                    console.log(error)
                }).finally(() => {
                    setOpenRemoveDialog(false);
                });

        }
    };

    const loadInfo = () => {
        setIsLoadedData(false)
        getActuatorsInfo()
            .then(async response => {setData(response.data);})
            .catch(error => {
                if (error.response){
                    if (error.response.status === 401) AuthService.logout();
                    console.log(error.response.data)
                }
                enqueueSnackbar("Error with actuator definitions.", {variant: 'error',
                    action: key => (
                        <IconButton size="small" aria-label="close" color="inherit"
                                    onClick={() => closeSnackbar(key)}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    )})
                console.log(error)
            }).finally(() => {setIsLoadedData(true)})
    }

    useEffect(()=>{
        getDefinitions('actuator')
            .then(async response => {setDefinitions(response.data)})
            .catch(error => {
                if (error.response){
                    if (error.response.status === 401) AuthService.logout();
                    console.log(error.response.data)
                }
                enqueueSnackbar("Error with actuators definitions.", {variant: 'error',
                    action: key => (
                        <IconButton size="small" aria-label="close" color="inherit"
                                    onClick={() => closeSnackbar(key)}>
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    )})
                console.log(error)
            }).finally(() => {setIsLoadedDef(true)});

    },[]);

    useEffect(()=>{
        loadInfo()
    },[]);


    return (
        <Box bgcolor="background.darker" boxShadow={2} borderRadius="20px" style={{padding: '30px 1vw', marginTop: '3vh'}}>
            <Typography variant="h5" gutterBottom align={"center"} style={{marginBottom: 35}}>
                Actuators sensors
            </Typography>
            {(isLoadedData && isLoadedDef) ?
                <DataGrid
                    getRowId={(row) => row.sensor_id}
                    rows={data}
                    columns={columns}
                    pageSize={5}
                    autoHeight
                    components={{
                        Toolbar: GridToolbar,
                    }}
                    disableColumnMenu
                />
                :
                <>
                    <Skeleton height={150}/>
                    <Skeleton/>
                    <Skeleton/>
                    <Skeleton/>
                    <Skeleton/>
                </>
            }
            <EditSensorDialog isOpen={openDialog} handleAccept={loadInfo} handleCancel={handleCancelDialog} title={'Edit Actuator'}
                              sensor={editSensor} rooms={rooms} definitions={definitions} />
            <ChooseDialog isOpen={openRemoveDialog} handleCancel={handleCancelRemoveDialog}
                          handleAgree={handleAgreeRemoveDialog} title={'Remove Actuator'} >
                <Typography variant="body1" gutterBottom align={"center"}>
                    Are you sure you want to remove the sensor?
                </Typography>
            </ChooseDialog>
        </Box>
    )
}
