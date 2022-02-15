import React, {useEffect, useState} from 'react';
import {makeStyles} from '@material-ui/core/styles';
import {useSnackbar} from "notistack";

import Box from '@material-ui/core/Box';
import Button from "@material-ui/core/Button";
import Divider from '@material-ui/core/Divider';
import Skeleton from "@material-ui/lab/Skeleton";
import Typography from '@material-ui/core/Typography';
import IconButton from "@material-ui/core/IconButton";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import CloseIcon from '@material-ui/icons/Close';
import AddIcon from '@material-ui/icons/Add';
import RemoveIcon from '@material-ui/icons/Remove';

import TriggerAddAction from "./TriggerAddAction";
import TriggerAddTrigger from "./TriggerAddTrigger";

import {logout} from "../../services/auth.service"
import {addTrigger, getSensorsByType, serialize} from '../../services/petitions.service'


const useStyles = makeStyles((theme) => ({
    divFormControl:{
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        alignItems: 'flex-end'
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 120,
    },
    sensorItem:{
        display: 'flex',
        alignItems: 'flex-end'
    },
    saveButton:{
        textAlign: 'center',
        marginTop: 15,
        marginBottom: 15
    },
    closeButton:{
        top: 0,
        right: 0,
        position: 'absolute'
    }
}));

const TriggerAdd = ({handleClose, handleAdd}) => {
    const classes = useStyles();
    const { enqueueSnackbar } = useSnackbar();

    const [data, setData] = useState({});
    const [error, setError] = useState('');
    const [isLoaded, setIsLoad] = useState(false);
    const [nTriggers, setnTriggers] = useState(1);
    const [nActions, setnActions] = useState(1);

    const submit = e => {
        e.preventDefault()
        const data = serialize(e.target);
        console.log(data)
        addTrigger(data)
            .then(response => {
                enqueueSnackbar("Trigger Created")
            })
            .catch(error => {
                if (error.response) {
                    console.log(error.response.data)
                    enqueueSnackbar(error.response.data, {variant: 'error',})
                }
                console.log(error.error)
                console.log(error.message)
            }).finally(() => {
                handleAdd()
                handleClose()
            });
    }

    useEffect(()=>{
        console.log("useEffect for getSensorsValuesGroupBy")
        getSensorsByType()
            .then(async response => {
                console.log(response.data)
                setData(response.data);
            }).catch(error => {
            if (error.response) {
                if (error.response.status === 401) logout()
                else if (error.response.status === 402) setError(error.response.data);
                else if (error.response.status === 403)setError(error.response.data);
            }
            else {
                setError(error.message);
            }

        }).finally(() => {
            setIsLoad(true)
        });

    },[]);


    const renderTriggers = () => {
        return [...Array(nTriggers)].map((e, i) =>
            <TriggerAddTrigger key={i} data={data} pos={i}/>
        )

    }
    const renderActions = () => {
        const sensors = Object.assign({}, data)
        delete sensors['active']
        delete sensors['passive']

        return [...Array(nActions)].map((e, i) =>
            <TriggerAddAction key={i} sensors={sensors} pos={i}/>
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
                <div>
                    <Typography variant="h4" gutterBottom align={"center"}>
                        Add Trigger
                    </Typography>
                    <IconButton className={classes.closeButton} onClick={handleClose}>
                        <CloseIcon/>
                    </IconButton>
                    {isLoaded?
                        <form onSubmit={submit} >
                            <input name="nTrigges" value={nTriggers} style={{display:'none'}}/>
                            <input name="nActions" value={nActions} style={{display:'none'}}/>

                            {renderTriggers()}
                            <ButtonGroup variant="text" aria-label="small primary button group">
                                <IconButton aria-label="delete" color="default"
                                            onClick={()=>{if(nTriggers >1) setnTriggers(nTriggers-1)}} >
                                    <RemoveIcon  fontSize="small"/>
                                </IconButton>
                                <IconButton aria-label="delete" color="default"
                                            onClick={()=> {setnTriggers(nTriggers+1)}} >
                                    <AddIcon fontSize="small"/>
                                </IconButton>
                            </ButtonGroup>

                            <Divider variant={'middle'} style={{margin:'20px 0'}}/>

                            <Typography variant="h5" gutterBottom align={"center"}>Action</Typography>
                            {renderActions()}

                            <ButtonGroup variant="text" aria-label="small primary button group">
                                <IconButton aria-label="delete" color="default"
                                            onClick={()=>{if(nActions >1)setnActions(nActions-1)}} >
                                    <RemoveIcon  fontSize="small"/>
                                </IconButton>
                                <IconButton aria-label="delete" color="default"
                                            onClick={()=> {setnActions(nActions+1)}} >
                                    <AddIcon fontSize="small"/>
                                </IconButton>
                            </ButtonGroup>

                            <div className={classes.saveButton}>
                                <Button color="primary" variant="contained" type={'submit'}>
                                    Save
                                </Button>
                            </div>
                        </form>

                        :
                        <>
                            <Skeleton style={{ height: 50 }}/>
                            <Skeleton style={{ height: 50 }}/>
                            <Skeleton style={{ height: 50 }}/>
                        </>
                    }
                </div>

        )
    }

}

export default TriggerAdd;

