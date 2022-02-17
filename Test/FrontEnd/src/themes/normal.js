import { createMuiTheme } from '@material-ui/core/styles'
import { red } from '@material-ui/core/colors'
import bg2 from './B2.jpg'

// A custom theme for this app
const theme = createMuiTheme({
  palette: {
    type: 'light',
    // primary: {
    //   main: '#556cd6',
    // },
    // secondary: {
    //   main: '#cc4444',
    // },
    secondary: {
      main: '#FFB74D',
      light: 'rgb(255, 197, 112)',
      dark: 'rgb(200, 147, 89)',
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    error: {
      main: red.A400,
    },
    background: {
      default: '#f5f5f5',
      darker: 'rgb(255, 255, 255, 0.35)',
      disabled: 'rgba(163,162,162,0.35)',
      backgroundImage: bg2,
      // paper
    },
    titleBar: {
      main: '#eeeeee',
      contrastText: '#222222',
    },
  },
})

export default theme
