import React, {useEffect, useState} from 'react';

import {makeStyles} from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import AddIcon from '@material-ui/icons/Add';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import InputLabel from "@material-ui/core/InputLabel";
import Input from '@material-ui/core/Input';
import {TextField} from "@material-ui/core";
import ChooseDialog from "../components/ChooseDialog";
import InputAdornment from '@material-ui/core/InputAdornment';
import Visibility from '@material-ui/icons/Visibility';
import VisibilityOff from '@material-ui/icons/VisibilityOff';

import {addUser, updateUser, updateUserPass, deleteUser, getUsers} from '../services/petitions.service'
import {useSnackbar} from "notistack";
import {useHistory} from "react-router-dom";
import AuthService from "../services/auth.service";
import Container from "@material-ui/core/Container";
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import Divider from '@material-ui/core/Divider';
import ListItemText from '@material-ui/core/ListItemText';
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";

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
        margin:"25px 10px 00px 0px"
    },
    formControl: {
        margin: theme.spacing(1),
        minWidth: 120,
    },
    editButton:{
        padding:10
    }
}));


const UsersConfig = () => {
    const classes = useStyles();
    const history = useHistory();
    const { enqueueSnackbar } = useSnackbar();

    const [users, setUsers] = useState();
    const [isLoaded, setIsLoaded] = useState();
    const [showPassword, setShowPassword] = useState(false);

    const [editUser, setEditUser] = useState(false);
    const [editPass, setEditPass] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const [user, setUser] = useState({});
    const [newPass, setNewPass] = useState('');
    const [errorPass, setErrorPass] = useState(false);

    const handleClickAddUser = () => {
        setUser({})
        setEditUser(false)
        setEditPass(false)
        setDialogOpen(true)
    }
    const handleClickEditUser = (user) => {
        setUser(user)
        setEditUser(user.name)
        setEditPass(false)
        setDialogOpen(true)
    }
    const handleClickEditPass = (user) => {
        setUser(user)
        setEditUser(false)
        setEditPass(true)
        setDialogOpen(true)
    }
    const handleClickDeleteUser = (user) => {
        setUser(user)
        setDeleteDialogOpen(true)
    }

    const handleClickDialogAgree= () => {
        if(editUser){
            handleEditUser()
        }else if (editPass){
            handleEditPass()
        }else{
            handleAddUser()
        }
        setUser({})
        setEditUser(false)
        setEditPass(false)
        setDialogOpen(false)
    }
    const handleAddUser = () => {
        const u = user
        user.passw= newPass
        addUser(user)
            .then(response => {
                setUsers([...users, u])
                enqueueSnackbar("user Created")
            })
            .catch(error => {
                if (error.response) enqueueSnackbar(error.response.data, {variant: 'error',})
                console.log(error.error)
                console.log(error.message)
            })
    }
    const handleEditUser= () => {
        updateUser(editUser, user)
            .then(response => {
                setUsers(users.map(r => r.name === editUser ?  user: r))
                enqueueSnackbar("user updated")
            })
            .catch(error => {
                if (error.response) enqueueSnackbar(error.response.data, {variant: 'error',})
                console.log(error.error)
                console.log(error.message)
            })
    };
    const handleEditPass= () => {
        updateUserPass(user.name, newPass)
            .then(response => {
                enqueueSnackbar("user updated")
            })
            .catch(error => {
                if (error.response) enqueueSnackbar(error.response.data, {variant: 'error',})
                console.log(error.error)
                console.log(error.message)
            })
    };
    const handleDeleteUser = () => {
        deleteUser(user.name)
            .then(response => {
                setUsers(users.filter((r) => r !== user))
                enqueueSnackbar("User deleted.")
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
        getUsers()
            .then(async response => {
                setUsers(response.data)})
            .catch(error => {
                if (error.response){
                    if (error.response.status === 401) AuthService.logout();
                    goError("ERROR", error.response.data)
                }else{
                    goError("ERROR", error.message)
                }
            }).finally(() => {setIsLoaded(true)});

    },[]);

    const renderUsers = () => {
        return(
            <>
                {isLoaded &&

                <List className={classes.list}>
                    {Object.entries(users).map(([key, user])=>
                        <div key={key}>
                            {key!=='0' && <Divider variant="inset" />}
                            <ListItem key={key}>
                                <ListItemText>
                                    <div className={classes.listItemText}>
                                        <Typography variant="h5">{user.name}</Typography>
                                        <Typography className={classes.listItemTextSubtitle} variant="subtitle1" >{user.role === 0 ? 'admin':'user'}</Typography>
                                        <div className={classes.listItemActions}>
                                            <IconButton className={classes.listItemActionsButton} edge="end" onClick={()=>handleClickEditUser(user)}>
                                                <EditIcon/>
                                            </IconButton>
                                            <IconButton className={classes.listItemActionsButton} edge="end" onClick={()=>handleClickEditPass(user)}>
                                                <span className="material-icons">password</span>
                                            </IconButton>
                                            <IconButton className={classes.listItemActionsButton} edge="end" onClick={()=>handleClickDeleteUser(user)}>
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
                <Typography variant="h4" gutterBottom align={"center"}>Users</Typography>
                <div className={classes.editButtonDiv}>
                    <IconButton className={classes.editButton} onClick={handleClickAddUser} size={"small"} color="primary" >
                        <AddIcon/>
                    </IconButton>
                </div>

                <ChooseDialog isOpen={dialogOpen} handleCancel={()=>setDialogOpen(false)}
                              handleAgree={handleClickDialogAgree} title={editPass? 'Edit user':'Add user'} >

                    {!editPass &&
                        <>
                            <FormControl className={classes.formControl}>
                                <TextField label="User" value={user.name} required
                                           onChange={e => setUser({...user, name: e.target.value})}/>
                            </FormControl>
                            <FormControl className={classes.formControl}>
                                <InputLabel htmlFor={"role"}>Set to</InputLabel>
                                <Select id={"role"} name={"role"} value={user.role} required
                                        onChange={e => setUser({...user, role: e.target.value})}>
                                    <MenuItem value={0}>Admin</MenuItem>
                                    <MenuItem value={1}>Normal User</MenuItem>
                                </Select>
                            </FormControl>

                        </>
                    }
                    {!editUser &&
                        <FormControl className={classes.formControl}>
                            <InputLabel htmlFor="password">Password</InputLabel>
                            <Input id="password" type={showPassword ? 'text' : 'password'} value={user.pass} required
                                onChange={e => setNewPass(e.target.value)}
                                endAdornment={
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            onClick={e => setShowPassword(true)}
                                            onMouseDown={e => setShowPassword(false)}
                                        >
                                            {showPassword ? <Visibility /> : <VisibilityOff />}
                                        </IconButton>
                                    </InputAdornment>
                                }
                            />
                        </FormControl>
                    }
                    {editPass &&
                        <FormControl className={classes.formControl}>
                            <TextField label="Confirm Password" value={user.pass} error={errorPass} type={'password'}
                                       onChange={e =>setErrorPass(newPass !== e.target.value)} required/>
                        </FormControl>
                    }

                </ChooseDialog>

                {renderUsers()}

                <ChooseDialog isOpen={deleteDialogOpen} handleCancel={()=>setDeleteDialogOpen(false)}
                              handleAgree={handleDeleteUser} title={'Remove '+user.name} >
                    <p>are you sure?</p>
                </ChooseDialog>
            </Box>
        </Container>

    )


}

export default UsersConfig;

