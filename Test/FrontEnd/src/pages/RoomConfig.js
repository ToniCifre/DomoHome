import React, {useEffect, useState} from 'react';

import {makeStyles} from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import AddIcon from '@material-ui/icons/Add';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import InputLabel from "@material-ui/core/InputLabel";
import {TextField} from "@material-ui/core";
import ChooseDialog from "../components/ChooseDialog";
import {addRoom, updateRoom, deleteRoom, getRooms} from '../services/petitions.service'
import {useSnackbar} from "notistack";
import {useHistory} from "react-router-dom";
import AuthService from "../services/auth.service";
import Container from "@material-ui/core/Container";
import List from "@material-ui/core/List";
import Divider from "@material-ui/core/Divider";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";


const useStyles = makeStyles((theme) => ({
    rootBox:{
        position:"relative",
        padding: '30px 1vw 50px 1vw',
        marginTop: '3vh'
    },
    list:{
        width: '100%',
        maxWidth: 360,
        margin:'auto',
        marginTop:25,
        backgroundColor: theme.palette.background.paper,
    },
    listItemText:{
        display:'flex',
        flexFlow: 'wrap',
        flexDirection: 'row',
        marginLeft:20,
    },
    listItemTextSubtitle:{
        alignSelf: 'flex-end',
        marginLeft: 15
    },
    listItemActions:{
        flexGrow: 1,
        textAlign: 'end',
        maxHeight: 30
    },
    listItemActionsButton:{
        padding: '0 10px'
    },
    editButtonDiv:{
        position: "absolute",
        right:0,
        top:0,
        margin:"19px 7px 00px 0px"
    },
    editButton:{
        padding:10,
    }
}));


const RoomConfig = () => {
    const classes = useStyles();
    const history = useHistory();
    const { enqueueSnackbar } = useSnackbar();

    const [rooms, setRooms] = useState();
    const [isLoaded, setIsLoaded] = useState();

    const [edit, setEdit] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const [room, setRoom] = useState('');
    const [editRoom, setEditRoom] = useState('');

    const handleClickAddRoom = () => {
        setRoom('')
        setEdit(false)
        setDialogOpen(true)
    }
    const handleClickEditRoom = (room) => {
        setEdit(true)
        setEditRoom(room)
        setRoom(room)
        setDialogOpen(true)
    }
    const handleClickDeleteRoom = (room) => {
        setRoom(room)
        setDeleteDialogOpen(true)
    }
    const handleAddRoom = () => {
        addRoom(room)
            .then(response => {
                setRooms([...rooms, room])
                enqueueSnackbar("Room Created")
            })
            .catch(error => {
                if (error.response) enqueueSnackbar(error.response.data, {variant: 'error',})
                console.log(error.error)
                console.log(error.message)
            })
        setDialogOpen(false)
    }
    const handleEditRoom = () => {
        updateRoom(editRoom, room)
            .then(response => {
                setRooms(rooms.map(r => r === editRoom ?  room: r))
                enqueueSnackbar("Room updated")
            })
            .catch(error => {
                if (error.response) enqueueSnackbar(error.response.data, {variant: 'error',})
                console.log(error.error)
                console.log(error.message)
            })
        setDialogOpen(false)
    };
    const handleDeleteRoom = () => {
        deleteRoom(room)
            .then(response => {
                setRooms(rooms.filter((r) => r !== room))
                enqueueSnackbar("Room deleted")
            })
            .catch(error => {
                if (error.response) {
                    enqueueSnackbar(error.response.data, {variant: 'error',})
                }
                console.log(error.error)
                console.log(error.message)
            })
        setDeleteDialogOpen(false)
    };

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
                    goError("ERROR", error.message)
                }
            }).finally(() => {setIsLoaded(true)});

    },[]);

    const renderRooms = () => {
        return(
            <>
                {isLoaded &&
                <List className={classes.list}>
                    {rooms.map((room, key)=>
                        <div key={key}>
                            {key!==0 && <Divider variant="inset" />}
                            <ListItem key={room}>
                                <ListItemText>
                                    <div className={classes.listItemText}>
                                        <Typography variant="h5">{room}</Typography>
                                        <div className={classes.listItemActions}>
                                            <IconButton className={classes.listItemActionsButton} edge="end" onClick={()=>handleClickEditRoom(room)}>
                                                <EditIcon/>
                                            </IconButton>
                                            <IconButton className={classes.listItemActionsButton} edge="end" onClick={()=>handleClickDeleteRoom(room)}>
                                                <DeleteIcon/>
                                            </IconButton>
                                        </div>
                                    </div>
                                </ListItemText>
                            </ListItem>
                        </div>
                    )}
                </List>
                }
            </>
        )
    }

    return (
        <Container maxWidth={"md"} disableGutters style={{marginTop: 25, marginBottom: 25,}}>
            <Box className={classes.rootBox} bgcolor="background.darker" boxShadow={2} borderRadius="20px" >
                <Typography variant="h5" gutterBottom align={"center"}> Rooms</Typography>
                <div className={classes.editButtonDiv}>
                    <IconButton className={classes.editButton} onClick={handleClickAddRoom} size={"small"} color="primary" >
                        <AddIcon fontSize={"large"}/>
                    </IconButton>
                </div>
                <ChooseDialog isOpen={dialogOpen} handleCancel={()=>setDialogOpen(false)}
                              handleAgree={edit? handleEditRoom:handleAddRoom} title={edit? 'Edit Room':'Add Room'} >
                    <InputLabel htmlFor={"timer"}> Room </InputLabel>
                    <TextField id="room" value={room} className={classes.timer}
                               onChange={event => setRoom(event.target.value)}/>
                </ChooseDialog>
                {renderRooms()}
                <ChooseDialog isOpen={deleteDialogOpen} handleCancel={()=>setDeleteDialogOpen(false)}
                              handleAgree={handleDeleteRoom} title={'Remove room'+room} >
                    <p>
                        If you remove this room all the devices inside the room will be removed.
                    </p>
                </ChooseDialog>
            </Box>
        </Container>

    )


}

export default RoomConfig;

