import normal from './normal'
import dark from './dark'

const themes = {
  normal: normal,
  dark: dark
}

export default function getTheme(theme) {
  return themes[theme]
}
