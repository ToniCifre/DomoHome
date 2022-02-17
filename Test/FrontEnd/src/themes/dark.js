import { createMuiTheme } from '@material-ui/core/styles'
import { red } from '@material-ui/core/colors'
import bg2 from "./B5.jpg";


// A custom theme for this app
const theme = createMuiTheme({
  palette: {
    type: 'dark',
    primary: {
      main: '#8093ff',
      light: 'rgb(127,202,255)',
      dark: 'rgb(5,71,114)',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ffb74d',
      light: 'rgb(255, 197, 112)',
      dark: 'rgb(200, 147, 89)',
      contrastText: 'rgba(0, 0, 0, 0.87)',
    },
    titleBar: {
      main: '#555555',
      contrastText: '#ffffff',
    },
    error: {
      main: red.A400,
    },
    background: {
      default: '#202124',
      darker: 'rgb(39, 39, 39, 0.35)',
      disabled: 'rgb(56, 55, 55, 1)',
      backgroundImage: bg2
    }
  },
})

export default theme
