import React, {useEffect, useState} from 'react';
import {useHistory} from "react-router-dom";

import {makeStyles} from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import Container from "@material-ui/core/Container";
import DialogContent from "@material-ui/core/DialogContent";
import Dialog from "@material-ui/core/Dialog";
import Skeleton from "@material-ui/lab/Skeleton";
import ChooseDialog from "../../components/ChooseDialog";
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import Divider from '@material-ui/core/Divider';
import ListItemText from '@material-ui/core/ListItemText';

import {useSnackbar} from "notistack";

import TriggerAdd from "./TriggerAdd";
import AuthService from "../../services/auth.service";
import {getTrigger, deleteTrigger} from '../../services/petitions.service'

const useStyles = makeStyles((theme) => ({
    rootBox:{
        position:"relative",
        padding: '30px 3vw 50px 3vw',
        marginTop: '6vh',
        textAlign: '-webkit-center'
    },
    list:{
        width: '100%',
        maxWidth: 400,
        marginTop:30,
        borderRadius: 10,
        backgroundColor: theme.palette.background.paper,
    },
    listTrigger:{
        marginLeft: 15
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
    listItemActionsButton:{
        padding: '10px',
        marginRight:1
    },
    addButtonDiv:{
        position: "absolute",
        right:0,
        top:0,
        margin:"25px 10px 00px 0px"
    },
    addButton:{
        padding:10
    },
    configTitleDiv: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: "center"
    },
    configDivider: {
        flexGrow: 1,
        marginLeft: 10
    },
    addDialog: {
        width: '100%'
    }
}));


const TriggerList = () => {
    const classes = useStyles();
    const history = useHistory();
    const { enqueueSnackbar } = useSnackbar();

    const [data, setData] = useState();
    const [isLoaded, setIsLoaded] = useState(false);

    const [triggerId, setTriggerId] = useState(false);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const handleClickAdd = () => {
        setAddDialogOpen(true)
    }
    const handleClickDelete = (tId) => {
        setTriggerId(tId)
        setDeleteDialogOpen(true)
    }
    const handleDeleteTrigger = () => {
        deleteTrigger(triggerId)
            .then(response => {
                enqueueSnackbar("Trigger deleted.")
            })
            .catch(error => {
                if (error.response) {
                    enqueueSnackbar(error.response.data, {variant: 'error',})
                }
                console.log(error.error)
                console.log(error.message)
            })
            .finally(() => {
                loadTriggers()
                setDeleteDialogOpen(false)
            });
    };

    const goError = (errorType, errorMessage) => history.push({pathname: 'error',
        state: {errorType:errorType, errorMessage:errorMessage}});

    const loadTriggers = () =>{
        setIsLoaded(false)
        getTrigger()
            .then(async response => {
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
        loadTriggers()
    },[]);

    const renderTriggers = () => {
        return(
            <List className={classes.list}>
                {Object.entries(data).map(([key, lists])=>
                    <div key={key}>
                    {key!=='0' && <Divider/>}

                    <List key={key} className={classes.listTrigger}>
                        <div className={classes.configTitleDiv}>
                            <Typography variant="h6" component="h6" align={"left"}>Triggers</Typography>
                            {/*<Divider className={classes.configDivider}/>*/}
                            <IconButton className={classes.listItemActionsButton} onClick={() => handleClickDelete(lists.trigger[0].id)} edge="end" >
                                <DeleteIcon/>
                            </IconButton>
                        </div>
                        {Object.entries(lists.trigger).map(([key2, t]) =>
                            <div key={key2}>
                                <ListItem key={key2}>
                                    <ListItemText>
                                        <div className={classes.listItemText}>
                                            <Typography variant="h5">{t.sensor_id}</Typography>
                                            <Typography className={classes.listItemTextSubtitle} variant="subtitle1" >{t.trigger}</Typography>
                                        </div>

                                    </ListItemText>

                                </ListItem>
                            </div>
                        )}
                            <Typography variant="h6" component="h6" align={"left"}>Actions</Typography>
                            {/*<Divider className={classes.configDivider}/>*/}
                        {
                            Object.entries(lists.actions).map(([key2, a])=>
                                <div key={key2}>
                                    <ListItem key={key2}>
                                        <ListItemText>
                                            <div className={classes.listItemText}>
                                                <Typography variant="h5">{a.sensor_id}</Typography>
                                                <Typography className={classes.listItemTextSubtitle} variant="subtitle1">
                                                    Value to {a.value}{a.timer !== 0 && `in ${a.timer} minutes`}
                                                </Typography>
                                            </div>
                                        </ListItemText>
                                    </ListItem>
                                </div>
                            )
                        }
                    </List>
                    </div>
                    )}
            </List>
        )
    }

    return (
        <Container maxWidth={"md"} disableGutters style={{marginTop: 25, marginBottom: 25,}}>
            <Box className={classes.rootBox} bgcolor="background.darker" boxShadow={2} borderRadius="20px" >
                <Typography variant="h4" gutterBottom align={"center"}>Trigger</Typography>
                <div className={classes.addButtonDiv}>
                    <IconButton className={classes.addButton} onClick={handleClickAdd} size={"small"} color="primary" >
                        <AddIcon/>
                    </IconButton>
                </div>


                {isLoaded ?
                    data.length!==0?
                        renderTriggers()
                        :
                        <Typography variant="h6" gutterBottom align={"center"} style={{marginTop:25}}>There is no trigger</Typography>
                    :
                    <>
                        <Skeleton style={{ height: 50 }}/>
                        <Skeleton style={{ height: 50 }}/>
                        <Skeleton style={{ height: 50 }}/>
                    </>
                }


                <Dialog
                    fullWidth
                    open={addDialogOpen}
                    onClose={()=> setAddDialogOpen(false)}
                    className={classes.addDialog}
                >
                    <DialogContent>
                        <TriggerAdd handleClose={()=> setAddDialogOpen(false)} handleAdd={loadTriggers} />
                    </DialogContent>
                </Dialog>

                <ChooseDialog isOpen={deleteDialogOpen} handleCancel={()=>setDeleteDialogOpen(false)}
                              handleAgree={handleDeleteTrigger} title={'Remove trigger '+triggerId} >
                    <p>are you sure?</p>
                </ChooseDialog>
            </Box>
        </Container>

    )


}

export default TriggerList;

