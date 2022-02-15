import React, {useEffect, useState} from 'react';

import {makeStyles} from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import AddIcon from '@material-ui/icons/Add';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';


import {getSchedulers, deleteScheduler} from '../services/petitions.service'
import AuthService from "../services/auth.service";

import {useSnackbar} from "notistack";
import {useHistory} from "react-router-dom";
import Container from "@material-ui/core/Container";
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import Divider from '@material-ui/core/Divider';
import ListItemText from '@material-ui/core/ListItemText';
import Skeleton from "@material-ui/lab/Skeleton";

import InputLabel from "@material-ui/core/InputLabel";
import Input from '@material-ui/core/Input';
import {Button, TextField} from "@material-ui/core";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import ChooseDialog from "../components/ChooseDialog";

const useStyles = makeStyles((theme) => ({
    rootBox:{
        position:"relative",
        padding: '30px 1vw 50px 1vw',
        marginTop: '6vh',
        textAlign: '-webkit-center'
    },
    list:{
        width: '100%',
        maxWidth: 560,
        marginTop:25,
        backgroundColor: theme.palette.background.paper,
    },
    listItemText:{
        display:'flex',
        flexFlow: 'wrap',
        flexDirection: 'row',
    },
    listItemTextIcon:{
        fontSize: '30px !important',
        marginRight: 15,
        maxWidth: 30
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
        margin:"25px 10px 00px 0px"
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 120,
        width: 185,
    },
    editButton:{
        padding:10
    },
    configTitleDiv: {
        marginTop: 15,
        display: 'flex'
    },
    configDivider: {
        flexGrow: 1,
        margin: 10,
        alignSelf: 'center'
    },
    addDialog: {
        width: '100%'
    },
    buttonOpenIcons:{
        verticalAlign: 'bottom'
    }
}));


const SchedulerConfig = () => {
    const classes = useStyles();
    const history = useHistory();
    const { enqueueSnackbar } = useSnackbar();

    const [data, setData] = useState({});
    const [isLoaded, setIsLoaded] = useState(false);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const [schedulerId, setSchedulerId] = useState(false);


    const handleClickDeleteScheduler = (schedulerId) => {
        setSchedulerId(schedulerId)
        setDeleteDialogOpen(true)
    }

    const handleDeleteScheduler = () => {
        deleteScheduler(schedulerId)
            .then(response => {
                enqueueSnackbar("Scheduler deleted.")
            })
            .catch(error => {
                if (error.response) {
                    enqueueSnackbar(error.response.data, {variant: 'error',})
                }
                console.log(error.error)
                console.log(error.message)
            })
            .finally(() => {
                loadSchedulers()
                setDeleteDialogOpen(false)
            });
    };

    const goError = (errorType, errorMessage) => history.push({pathname: 'error',
        state: {errorType:errorType, errorMessage:errorMessage}});

    const loadSchedulers = () =>{
        setIsLoaded(false)
        getSchedulers()
            .then(async response => {
                console.log(response.data)
                setData(response.data)})
            .catch(error => {
                if (error.response){
                    if (error.response.status === 401) AuthService.logout();
                    goError("ERROR", error.response.data)
                }else{
                    goError("ERROR", error.message)
                }
            }).finally(() => {setIsLoaded(true)});
    }

    useEffect(()=>{
        console.log("useEffect for getScheduler")
        loadSchedulers()
    }, []);

    const renderSchedulers = () => {
        return(
            <List className={classes.list}>

            {Object.entries(data).map(([key, scheduler]) =>
                    <div>
                        {key!=='0' && <Divider/>}
                        <ListItem key={key}>
                            <ListItemText>
                                <div className={classes.listItemText}>
                                    <Typography variant="h6">Set {scheduler.sensor_id} to {scheduler.value} every {scheduler.every} at {scheduler.at}</Typography>
                                    <div className={classes.listItemActions}>
                                        <IconButton className={classes.listItemActionsButton} edge="end"
                                                    onClick={() => handleClickDeleteScheduler(scheduler.id)}>
                                            <DeleteIcon/>
                                        </IconButton>
                                    </div>
                                </div>
                            </ListItemText>
                        </ListItem>
                    </div>
                )}

            </List>

        )
    }

    return (
        <Container maxWidth={"md"} disableGutters style={{marginTop: 25, marginBottom: 25,}}>
            <Box className={classes.rootBox} bgcolor="background.darker" boxShadow={2} borderRadius="20px" >
                <Typography variant="h4" gutterBottom align={"center"}>Scheduler</Typography>
                {isLoaded ?
                    renderSchedulers()
                    :
                    <>
                        <Skeleton style={{ height: 50 }}/>
                        <Skeleton style={{ height: 50 }}/>
                        <Skeleton style={{ height: 50 }}/>
                    </>
                }

                <ChooseDialog isOpen={deleteDialogOpen} handleCancel={()=>setDeleteDialogOpen(false)}
                              handleAgree={handleDeleteScheduler} title={'Remove scheduler'} >
                    <p>are you sure?</p>
                </ChooseDialog>
            </Box>
        </Container>

    )


}

export default SchedulerConfig;

