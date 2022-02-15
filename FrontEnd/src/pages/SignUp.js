import React, {useState} from 'react';
import { makeStyles } from '@material-ui/core/styles';

import Box from "@material-ui/core/Box";
import Link from '@material-ui/core/Link';
import Avatar from '@material-ui/core/Avatar';
import Button from '@material-ui/core/Button';
import Container from '@material-ui/core/Container';
import Typography from '@material-ui/core/Typography';

import LockOutlinedIcon from '@material-ui/icons/LockOutlined';
import TextField from '@material-ui/core/TextField';

import CssBaseline from '@material-ui/core/CssBaseline';
import AuthService from '../services/auth.service'

const useStyles = makeStyles((theme) => ({
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
        width: '100%',
        marginTop: theme.spacing(3),
    },
    submit: {
        margin: theme.spacing(3, 0, 2),
    },
}));

export default function SignUp() {
    const classes = useStyles();

    const [message, setMessage] = useState("");

    const handleRegister = e => {
        e.preventDefault();
        const data = e.target;
        AuthService.register(data.username.value, data.password.value)
            .then(
                response => {
                    setMessage(response.data.message);
                },
                error => {
                    const resMessage = error.response.data || error.message;
                    setMessage(resMessage);
                }
            );

    }


    return (
        <Container component="main" maxWidth="xs">
            <CssBaseline />
            <div className={classes.paper}>
                <Avatar className={classes.avatar}>
                    <LockOutlinedIcon />
                </Avatar>
                <Typography component="h1" variant="h5">
                    Sign up
                </Typography>
                <form className={classes.form} onSubmit={handleRegister} >
                        <TextField
                            name="username"
                            variant="outlined"
                            required
                            fullWidth
                            id="firstName"
                            label="First Name"
                            autoFocus
                        />
                        <TextField
                            variant="outlined"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type="password"
                            id="password"
                        />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        color="primary"
                        className={classes.submit}
                    >
                        Sign Up
                    </Button>
                </form>
                <Link href="#">
                    <Typography component="body2" align={'left'} color={"textSecondary"}>
                        Already have an account? Sign in
                    </Typography>
                </Link>
                {message &&
                    <Box component="span" m={4} color="text.error">
                        <Typography component="body1" color={"error"}>
                            {message}
                        </Typography>
                    </Box>
                }
            </div>
        </Container>
    );
}
