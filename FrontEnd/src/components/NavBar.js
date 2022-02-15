import React, {useContext} from 'react';

import { makeStyles } from '@material-ui/core/styles';

import List from '@material-ui/core/List';
import Divider from '@material-ui/core/Divider';
import ListItem from '@material-ui/core/ListItem';
import IconButton from '@material-ui/core/IconButton';
import Drawer from '@material-ui/core/Drawer';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';

import MenuIcon from '@material-ui/icons/Menu';

import Brightness4Icon from '@material-ui/icons/Brightness4';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import Typography from "@material-ui/core/Typography";
import VisibilityIcon from '@material-ui/icons/Visibility';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import {Link, useHistory} from "react-router-dom";
import AuthService from "../services/auth.service";
import {CustomThemeContext} from "../themes/CustomThemeProvider";


const useStyles = makeStyles((theme) => ({
    root: {
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems:'center',
        width: '100%',
        height: 50
    },
    tittle:{
        padding: '0 10px 0 20px',
        flexGrow: 12
    },
    tittleLink:{
        textDecoration: 'none',
        color: theme.palette.text.primary,
    },
    navButton:{
        flexGrow: 1,
    },
    iconButton:{
        marginRight: 0
    },
    drawer: {
        flexShrink: 0,
        width: 200
    },
    drawerUser:{
        padding: '0 0 10px',
        flexGrow: 1
    },
    drawerHeader: {
        display: 'flex',
        alignItems: 'center',
        padding: theme.spacing(0, 1),
        ...theme.mixins.toolbar,
        justifyContent: 'flex-start'
    },
    darkModeButton: {
        marginLeft: "auto"
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
    largeDivider: {
        flexGrow: 1,
        width: 200
    }
}));


export default function PersistentDrawerRight() {
    const classes = useStyles();
    const history = useHistory();
    const { currentTheme, setTheme } = useContext(CustomThemeContext)

    const [open, setOpen] = React.useState(false);
    const user = AuthService.getCurrentUser();

    const switchTheme = () => {
        if (currentTheme !== 'dark') setTheme('dark')
        else setTheme('normal')
    }

    const handleDrawerOpen = () => {setOpen(true);};
    const handleDrawerClose = () => {setOpen(false);};
    const handleLink = (link) =>{
        setOpen(false);
        history.push({pathname: link})
    }

    return (
        <>
            <div className={classes.root}>
                    <Typography variant="h4" component="h4" align={"left"} className={classes.tittle}>
                        <Link to="/" className={classes.tittleLink}>
                            Home
                        </Link>
                    </Typography>

                <div className={classes.navButton}>
                    <IconButton
                        className={classes.iconButton}
                        color="inherit"
                        aria-label="open drawer"
                        edge="end"
                        onClick={handleDrawerOpen}
                    >
                        <MenuIcon fontSize={"large"}/>
                    </IconButton>
                </div>
            </div>

            <Drawer
                className={classes.drawer}
                variant="temporary"
                anchor="right"
                onClose={handleDrawerClose}
                open={open}
            >
                <div className={classes.drawerHeader}>
                    <IconButton onClick={handleDrawerClose}>
                        <ChevronRightIcon />
                    </IconButton>
                    <IconButton className={classes.darkModeButton}  onClick={switchTheme}>
                        <Brightness4Icon />
                    </IconButton>
                </div>

                <ListItem >
                    <Typography variant="h6" component="h6" align={"center"} className={classes.drawerUser}>
                        Hello {AuthService.getCurrentUser().user}
                    </Typography>
                </ListItem>

                <Divider />
                <List>
                    <ListItem button onClick={() => handleLink('visibility')}>
                        <ListItemIcon><VisibilityIcon /></ListItemIcon>
                        <ListItemText primary={'Visibility'} />
                    </ListItem>
                </List>

                {user.role === 0 &&
                <React.Fragment>
                    <List>
                        <ListItem button onClick={() => handleLink('trigger')}>
                            <ListItemIcon><span className="material-icons">ads_click</span></ListItemIcon>
                            <ListItemText primary={'Trigger'} />
                        </ListItem>
                    </List>
                    <div className={classes.configTitleDiv}>
                        <Divider className={classes.configDivider}/>
                        <Typography variant="h6" component="h6" align={"center"}>
                            Config
                        </Typography>
                        <Divider className={classes.configDivider}/>
                    </div>

                    <List>
                        <ListItem button onClick={() => handleLink('device-config')}>
                            <ListItemIcon>
                                <span className="material-icons">app_settings_alt</span>
                            </ListItemIcon>
                            <ListItemText primary={'Device'} />
                        </ListItem>
                        <ListItem button onClick={() => handleLink('rooms')}>
                            <ListItemIcon><span className="material-icons">chair</span></ListItemIcon>
                            <ListItemText primary={'Rooms'} />
                        </ListItem>
                        <ListItem button onClick={() => handleLink('users')}>
                            <ListItemIcon><span className="material-icons">people_alt</span></ListItemIcon>
                            <ListItemText primary={'Users'} />
                        </ListItem>
                        <ListItem button onClick={() => handleLink('definitions')}>
                            <ListItemIcon><span className="material-icons">assignment</span></ListItemIcon>
                            <ListItemText primary={'Definitions'} />
                        </ListItem>
                        <ListItem button onClick={() => handleLink('schedulers')}>
                            <ListItemIcon><span className="material-icons">today</span></ListItemIcon>
                            <ListItemText primary={'Scheduler'} />
                        </ListItem>
                    </List>
                    <Divider />
                </React.Fragment>
                }

                <div className={classes.largeDivider}/>
                <List>
                    <ListItem button onClick={AuthService.logout}>
                        <ListItemIcon><ExitToAppIcon /></ListItemIcon>
                        <ListItemText primary={'Close session'} />
                    </ListItem>
                </List>

            </Drawer>
        </>

    );
}






