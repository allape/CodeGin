import React from 'react'
import ReactDOM from 'react-dom'
import './index.scss'
import reportWebVitals from './reportWebVitals'
import Home from './view/Home'
import i18n from './i18n/config'
import {I18nextProvider} from 'react-i18next'

ReactDOM.render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <Home />
    </I18nextProvider>
  </React.StrictMode>,
  document.getElementById('root')
)

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
