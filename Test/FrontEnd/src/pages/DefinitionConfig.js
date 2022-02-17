import React, {useEffect, useState} from 'react';

import {makeStyles} from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import AddIcon from '@material-ui/icons/Add';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';


import {
    getAllDefinitions,
    addDefinition,
    updateDefinition,
    deleteDefinition} from '../services/petitions.service'
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
        maxWidth: 360,
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


const DefinitionConfig = () => {
    const classes = useStyles();
    const history = useHistory();
    const { enqueueSnackbar } = useSnackbar();

    const [data, setData] = useState({});
    const [isLoaded, setIsLoaded] = useState(false);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);

    const [definitionId, setDefinitionId] = useState(false);
    const [definition, setDefinition] = useState({});

    const handleClickAddDefinition = () => {
        setDefinition({})
        setDialogOpen(true)
        setDefinitionId(false)
    }
    const handleClickEditDefinition = (definition, dType) => {
        definition.type = dType
        setDefinition(definition)
        setDefinitionId(definition.definition)
        setDialogOpen(true)
    }
    const handleClickDeleteDefinition = (definition, dType) => {
        definition.type = dType
        setDefinition(definition)
        setDeleteDialogOpen(true)
    }

    const handleAddDefinition = () => {
        setIsLoaded(false)
        addDefinition(definition.type, definition)
            .then(response => {
                enqueueSnackbar("definition Created")
            })
            .catch(error => {
                if (error.response) enqueueSnackbar(error.response.data, {variant: 'error',})
                console.log(error.error)
                console.log(error.message)
            }).finally(() => {
                loadDefinitions()
                setDialogOpen(false)
        });
    }
    const handleEditDefinition= () => {
        setIsLoaded(false)
        updateDefinition(definition.type, definitionId, definition)
            .then(response => {
                enqueueSnackbar("definition updated")
            })
            .catch(error => {
                if (error.response) enqueueSnackbar(error.response.data, {variant: 'error',})
                console.log(error.error)
                console.log(error.message)
            }).finally(() => {
                loadDefinitions()
                setDialogOpen(false)
            });
    };

    const handleDeleteDefinition = () => {
        deleteDefinition(definition.type, definition.definition)
            .then(response => {
                enqueueSnackbar("Definition deleted.")
            })
            .catch(error => {
                if (error.response) {
                    enqueueSnackbar(error.response.data, {variant: 'error',})
                }
                console.log(error.error)
                console.log(error.message)
            })
            .finally(() => {
                loadDefinitions()
                setDeleteDialogOpen(false)
            });
    };

    const goError = (errorType, errorMessage) => history.push({pathname: 'error',
        state: {errorType:errorType, errorMessage:errorMessage}});

    const loadDefinitions = () =>{
        setIsLoaded(false)
        getAllDefinitions()
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
        loadDefinitions()
    },[]);

    const renderDefinitions = () => {
        return(
            <List className={classes.list}>
                {Object.entries(data).map(([key, lists])=>
                    <div key={key}>

                        <List>
                            <Typography variant="h5" align={'left'} style={{margin: '6px 15px'}}>{key}</Typography>
                            <div style={{width: '80%', alignSelf: 'flex-end'}} >
                                {Object.entries(lists).map(([key2, d]) =>
                                    <div key={key2}>
                                        <ListItem>
                                            <ListItemText>
                                                <div className={classes.listItemText}>
                                                    <span className={"material-icons " + classes.listItemTextIcon}>{d.icon}</span>
                                                    <Typography variant="h6">{d.definition}</Typography>
                                                    <div className={classes.listItemActions}>
                                                        <IconButton className={classes.listItemActionsButton} edge="end" onClick={()=>handleClickEditDefinition(d, key)}>
                                                            <EditIcon/>
                                                        </IconButton>
                                                        <IconButton className={classes.listItemActionsButton} edge="end" onClick={()=>handleClickDeleteDefinition(d, key)}>
                                                            <DeleteIcon/>
                                                        </IconButton>
                                                    </div>
                                                </div>
                                            </ListItemText>
                                        </ListItem>
                                    </div>
                                )}
                            </div>
                        </List>
                        <Divider/>
                    </div>
                )}
            </List>
        )
    }

    return (
        <Container maxWidth={"md"} disableGutters style={{marginTop: 25, marginBottom: 25,}}>
            <Box className={classes.rootBox} bgcolor="background.darker" boxShadow={2} borderRadius="20px" >
                <Typography variant="h4" gutterBottom align={"center"}>Definition</Typography>
                <div className={classes.editButtonDiv}>
                    <IconButton className={classes.editButton} onClick={handleClickAddDefinition} size={"small"} color="primary" >
                        <AddIcon/>
                    </IconButton>
                </div>


                {isLoaded ?
                    renderDefinitions()
                    :
                    <>
                        <Skeleton style={{ height: 50 }}/>
                        <Skeleton style={{ height: 50 }}/>
                        <Skeleton style={{ height: 50 }}/>
                    </>
                }



                <ChooseDialog isOpen={dialogOpen} handleCancel={()=>setDialogOpen(false)}
                               handleAgree={definitionId? handleEditDefinition:handleAddDefinition} title={definitionId? 'Edit definition':'Add definition'} >
                        <>
                            {!definitionId &&
                                <FormControl className={classes.formControl}>
                                    <InputLabel htmlFor={"type"}>Set to</InputLabel>
                                    <Select id={"type"} name={"type"} required
                                            onChange={e => setDefinition({...definition, type: e.target.value})}>
                                        {Object.entries(data).map(([key]) => <MenuItem key={key} value={key}>{key}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            }

                            <FormControl className={classes.formControl}>
                                <TextField label="Name" value={definition.definition} required
                                           onChange={e => setDefinition({...definition, definition: e.target.value})}/>
                            </FormControl>


                            <FormControl className={classes.formControl}>
                                <InputLabel htmlFor="icon">Icon</InputLabel>
                                <Input id="icon" value={definition.icon}
                                       onChange={e => setDefinition({...definition, icon: e.target.value})}
                                       endAdornment={
                                           <span className={"material-icons " + classes.listItemTextIcon}>{definition.icon}</span>
                                       }
                                />
                            </FormControl>

                            <FormControl className={classes.buttonOpenIcons}>
                                <Button onClick={() => window.open('https://fonts.google.com/icons?selected=Material+Icons')}>See all icons</Button>
                            </FormControl>
                        </>
                </ChooseDialog>

                <ChooseDialog isOpen={deleteDialogOpen} handleCancel={()=>setDeleteDialogOpen(false)}
                              handleAgree={handleDeleteDefinition} title={'Remove definition '+definitionId} >
                    <p>are you sure?</p>
                </ChooseDialog>
            </Box>
        </Container>

    )


}

export default DefinitionConfig;

