import React from 'react';
import ReactDOM from 'react-dom';

import reportWebVitals from './reportWebVitals';

import CssBaseline from '@material-ui/core/CssBaseline'

import './css/index.css';
import App from './App';
import CustomThemeProvider from './themes/CustomThemeProvider'
import {SnackbarProvider} from 'notistack';


ReactDOM.render(
    // <React.StrictMode>
        <CustomThemeProvider>
            <CssBaseline />
            <SnackbarProvider maxSnack={3} preventDuplicate={true} variant={'success'}>
                <App />
            </SnackbarProvider>
        </CustomThemeProvider>,
    // </React.StrictMode>,

  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
