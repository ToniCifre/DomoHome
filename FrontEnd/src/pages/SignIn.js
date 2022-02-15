import React, {useState} from 'react';

import Box from "@material-ui/core/Box";
import Link from '@material-ui/core/Link';
import Button from '@material-ui/core/Button';
import Avatar from '@material-ui/core/Avatar';
import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';
import LockOutlinedIcon from '@material-ui/icons/LockOutlined';

import TextField from '@material-ui/core/TextField';
import makeStyles from '@material-ui/core/styles/makeStyles';

import { useSnackbar } from 'notistack';

import AuthService from "../services/auth.service";
import Loader from "../components/Loading";
import {Redirect, useHistory} from "react-router-dom";

const useStyles = makeStyles((theme) => ({
    root:{
        backgroundColor: theme.palette.background.default
    },
    paper: {
        marginTop: theme.spacing(8),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    avatar: {
        margin: theme.spacing(1),
        backgroundColor: theme.palette.secondary.main,
    },
    form: {
        width: '100%', // Fix IE 11 issue.
        marginTop: theme.spacing(1),
    },
    submit: {
        margin: theme.spacing(3, 0, 2),
    },
}));


export default function SignIn({setLoggedIn}) {
    const classes = useStyles();
    const history = useHistory();

    const { enqueueSnackbar, closeSnackbar } = useSnackbar();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const handleAccept = () => {
        window.open(process.env.REACT_APP_API_ENDPOINT+"/api/test");
    };

    const handleSignIn = e => {
        e.preventDefault();
        const data = e.target;
        setLoading(true);
        AuthService.login(data.username.value, data.password.value)
            .then(
                response => {
                    setLoggedIn(true)
                    history.replace({pathname: '/'})
                    enqueueSnackbar('Hello,' + response)
                },
                error => {
                    if(error.response){
                        if(error.response.status === 401){
                            setMessage('User or password incorrect.');
                        }else{
                            setMessage(error.response.data);
                        }
                    }else if(error.message === 'Network Error'){
                        enqueueSnackbar('Error en la xerxa. Vols accedir a la api?', {
                            variant: 'error',
                            persist: true,
                            action: key => (
                                <React.Fragment>
                                    <Button size="small" onClick={handleAccept}>
                                        Go
                                    </Button>
                                    <IconButton size="small" aria-label="close" color="inherit"
                                                onClick={() => closeSnackbar(key)}>
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </React.Fragment>
                            ),
                        })
                        setMessage(error.message);
                    }else{
                        setMessage(error.message);
                    }
                    setLoading(false);
                }
            );

    }
    return (
        <div className={classes.root}>
            <Container component="main" maxWidth="xs">
                <Loader center size={150} open={loading}/>

                <div className={classes.paper}>
                    <Avatar className={classes.avatar}>
                        <LockOutlinedIcon />
                    </Avatar>
                    <Typography component="h1" variant="h5">
                        Sign in
                    </Typography>
                    {message &&
                    <Box component="span" m={1} color="text.error">
                        <Typography variant="body1" color={"error"}>
                            {message}
                        </Typography>
                    </Box>
                    }
                    <form className={classes.form} onSubmit={handleSignIn}>
                        <TextField
                            variant="outlined"
                            margin="normal"
                            required
                            fullWidth
                            id="username"
                            label="username"
                            name="username"
                            autoFocus
                        />
                        <TextField
                            variant="outlined"
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type="password"
                            id="password"
                            autoComplete="current-password"
                        />
                        <Button type="submit" fullWidth variant="contained" color="primary" className={classes.submit}>
                            Sign In
                        </Button>
                        <Link href="/signup">
                            <Typography variant="body2" align={'left'} color={"textSecondary"}>
                                Sign Up
                            </Typography>
                        </Link>
                    </form>
                </div>
            </Container>
        </div>

    );
}
